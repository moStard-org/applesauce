import { Filter, kinds, NostrEvent } from "nostr-tools";
import { isAddressableKind } from "nostr-tools/kinds";
import {
	EMPTY,
	filter,
	finalize,
	from,
	merge,
	mergeMap,
	Observable,
	ReplaySubject,
	share,
	take,
	timer,
} from "rxjs";

import hash_sum from "hash-sum";
import { getDeleteCoordinates, getDeleteIds } from "../helpers/delete.js";
import {
	EventStoreSymbol,
	FromCacheSymbol,
	getReplaceableAddress,
	isReplaceable,
} from "../helpers/event.js";
import { matchFilters } from "../helpers/filter.js";
import { parseCoordinate } from "../helpers/pointers.js";
import { addSeenRelay, getSeenRelays } from "../helpers/relays.js";
import {
	EventModel,
	EventsModel,
	ReplaceableModel,
	ReplaceableSetModel,
	TimelineModel,
} from "../models/common.js";
import { EventSet } from "./event-set.js";
import { IEventStore, ModelConstructor } from "./interface.js";
import { ProfileModel } from "../models/profile.js";
import { ContactsModel } from "../models/contacts.js";
import { MuteModel } from "../models/mutes.js";
import { ReactionsModel } from "../models/reactions.js";
import { MailboxesModel } from "../models/mailboxes.js";
import { UserBlossomServersModel } from "../models/blossom.js";
import { CommentsModel, ThreadModel } from "../models/index.js";
import { AddressPointer, EventPointer } from "nostr-tools/nip19";

export class EventStore implements IEventStore {
	database: EventSet;

	/** Enable this to keep old versions of replaceable events */
	keepOldVersions = false;

	/**
	 * A method used to verify new events before added them
	 * @returns true if the event is valid, false if it should be ignored
	 */
	verifyEvent?: (event: NostrEvent) => boolean;

	/** A stream of new events added to the store */
	insert$: Observable<NostrEvent>;

	/** A stream of events that have been updated */
	update$: Observable<NostrEvent>;

	/** A stream of events that have been removed */
	remove$: Observable<NostrEvent>;

	constructor() {
		this.database = new EventSet();

		// verify events before they are added to the database
		this.database.onBeforeInsert = (event) => {
			// Ignore events that are invalid
			if (this.verifyEvent && this.verifyEvent(event) === false) return false;
			else return true;
		};

		// when events are added to the database, add the symbol
		this.database.insert$.subscribe((event) => {
			Reflect.set(event, EventStoreSymbol, this);
		});

		// when events are removed from the database, remove the symbol
		this.database.remove$.subscribe((event) => {
			Reflect.deleteProperty(event, EventStoreSymbol);
		});

		this.insert$ = this.database.insert$;
		this.update$ = this.database.update$;
		this.remove$ = this.database.remove$;
	}

	// delete state
	protected deletedIds = new Set<string>();
	protected deletedCoords = new Map<string, number>();
	protected checkDeleted(event: string | NostrEvent) {
		if (typeof event === "string") return this.deletedIds.has(event);
		else {
			if (this.deletedIds.has(event.id)) return true;

			if (isAddressableKind(event.kind)) {
				const deleted = this.deletedCoords.get(getReplaceableAddress(event));
				if (deleted) return deleted > event.created_at;
			}

			return false;
		}
	}

	// handling delete events
	protected handleDeleteEvent(deleteEvent: NostrEvent) {
		const ids = getDeleteIds(deleteEvent);
		for (const id of ids) {
			this.deletedIds.add(id);

			// remove deleted events in the database
			const event = this.database.getEvent(id);
			if (event) this.database.remove(event);
		}

		const coords = getDeleteCoordinates(deleteEvent);
		for (const coord of coords) {
			this.deletedCoords.set(
				coord,
				Math.max(this.deletedCoords.get(coord) ?? 0, deleteEvent.created_at),
			);

			// Parse the nostr address coordinate
			const parsed = parseCoordinate(coord);
			if (!parsed) continue;

			// Remove older versions of replaceable events
			const events =
				this.database.getReplaceableHistory(
					parsed.kind,
					parsed.pubkey,
					parsed.identifier,
				) ?? [];
			for (const event of events) {
				if (event.created_at < deleteEvent.created_at)
					this.database.remove(event);
			}
		}
	}

	/** Copies important metadata from and identical event to another */
	static mergeDuplicateEvent(source: NostrEvent, dest: NostrEvent) {
		const relays = getSeenRelays(source);
		if (relays) {
			for (const relay of relays) addSeenRelay(dest, relay);
		}

		// copy the from cache symbol only if its true
		const fromCache = Reflect.get(source, FromCacheSymbol);
		if (fromCache && !Reflect.get(dest, FromCacheSymbol))
			Reflect.set(dest, FromCacheSymbol, fromCache);
	}

	/**
	 * Adds an event to the store and update subscriptions
	 * @returns The existing event or the event that was added, if it was ignored returns null
	 */
	add(event: NostrEvent, fromRelay?: string): NostrEvent | null {
		if (event.kind === kinds.EventDeletion) this.handleDeleteEvent(event);

		// Ignore if the event was deleted
		if (this.checkDeleted(event)) return event;

		// Get the replaceable identifier
		const d = isReplaceable(event.kind)
			? event.tags.find((t) => t[0] === "d")?.[1]
			: undefined;

		// Don't insert the event if there is already a newer version
		if (!this.keepOldVersions && isReplaceable(event.kind)) {
			const existing = this.database.getReplaceableHistory(
				event.kind,
				event.pubkey,
				d,
			);

			// If there is already a newer version, copy cached symbols and return existing event
			if (
				existing &&
				existing.length > 0 &&
				existing[0].created_at >= event.created_at
			) {
				EventStore.mergeDuplicateEvent(event, existing[0]);
				return existing[0];
			}
		} else if (this.database.hasEvent(event.id)) {
			// Duplicate event, copy symbols and return existing event
			const existing = this.database.getEvent(event.id);
			if (existing) {
				EventStore.mergeDuplicateEvent(event, existing);
				return existing;
			}
		}

		// Insert event into database
		const inserted = this.database.add(event);

		// If the event was ignored, return null
		if (inserted === null) return null;

		// Copy cached data if its a duplicate event
		if (event !== inserted) EventStore.mergeDuplicateEvent(event, inserted);

		// attach relay this event was from
		if (fromRelay) addSeenRelay(inserted, fromRelay);

		// remove all old version of the replaceable event
		if (!this.keepOldVersions && isReplaceable(event.kind)) {
			const existing = this.database.getReplaceableHistory(
				event.kind,
				event.pubkey,
				d,
			);

			if (existing) {
				const older = Array.from(existing).filter(
					(e) => e.created_at < event.created_at,
				);
				for (const old of older) this.database.remove(old);

				// return the newest version of the replaceable event
				// most of the time this will be === event, but not always
				if (existing.length !== older.length) return existing[0];
			}
		}

		return inserted;
	}

	/** Removes an event from the database and updates subscriptions */
	remove(event: string | NostrEvent): boolean {
		return this.database.remove(event);
	}

	/** Add an event to the store and notifies all subscribes it has updated */
	update(event: NostrEvent): boolean {
		return this.database.update(event);
	}

	/** Removes any event that is not being used by a subscription */
	prune(max?: number): number {
		return this.database.prune(max);
	}

	/** Check if the store has an event by id */
	hasEvent(id: string): boolean {
		return this.database.hasEvent(id);
	}

	/** Get an event by id from the store */
	getEvent(id: string): NostrEvent | undefined {
		return this.database.getEvent(id);
	}

	/** Check if the store has a replaceable event */
	hasReplaceable(kind: number, pubkey: string, d?: string): boolean {
		return this.database.hasReplaceable(kind, pubkey, d);
	}

	/** Gets the latest version of a replaceable event */
	getReplaceable(
		kind: number,
		pubkey: string,
		identifier?: string,
	): NostrEvent | undefined {
		return this.database.getReplaceable(kind, pubkey, identifier);
	}

	/** Returns all versions of a replaceable event */
	getReplaceableHistory(
		kind: number,
		pubkey: string,
		identifier?: string,
	): NostrEvent[] | undefined {
		return this.database.getReplaceableHistory(kind, pubkey, identifier);
	}

	/** Get all events matching a filter */
	getByFilters(filters: Filter | Filter[]): Set<NostrEvent> {
		return this.database.getByFilters(filters);
	}

	/** Returns a timeline of events that match filters */
	getTimeline(filters: Filter | Filter[]): NostrEvent[] {
		return this.database.getTimeline(filters);
	}

	/** Sets the claim on the event and touches it */
	claim(event: NostrEvent, claim: any): void {
		this.database.claim(event, claim);
	}
	/** Checks if an event is claimed by anything */
	isClaimed(event: NostrEvent): boolean {
		return this.database.isClaimed(event);
	}
	/** Removes a claim from an event */
	removeClaim(event: NostrEvent, claim: any): void {
		this.database.removeClaim(event, claim);
	}
	/** Removes all claims on an event */
	clearClaim(event: NostrEvent): void {
		this.database.clearClaim(event);
	}

	/** A directory of all active models */
	protected models = new Map<
		ModelConstructor<any, any[]>,
		Map<string, Observable<any>>
	>();

	/** How long a model should be kept "warm" while nothing is subscribed to it */
	modelKeepWarm = 60_000;

	/** Get or create a model on the event store */
	model<T extends unknown, Args extends Array<any>>(
		constructor: ModelConstructor<T, Args>,
		...args: Args
	): Observable<T> {
		let models = this.models.get(constructor);
		if (!models) {
			models = new Map();
			this.models.set(constructor, models);
		}

		const key = constructor.getKey
			? constructor.getKey(...args)
			: hash_sum(args);
		let model: Observable<T> | undefined = models.get(key);

		// Create the model if it does not exist
		if (!model) {
			const cleanup = () => {
				// Remove the model from the cache if its the same one
				if (models.get(key) === model) models.delete(key);
			};

			model = constructor(...args)(this).pipe(
				// remove the model when its unsubscribed
				finalize(cleanup),
				// only subscribe to models once for all subscriptions
				share({
					connector: () => new ReplaySubject(1),
					resetOnComplete: () => timer(this.modelKeepWarm),
					resetOnRefCountZero: () => timer(this.modelKeepWarm),
				}),
			);

			// Add the model to the cache
			models.set(key, model);
		}

		return model;
	}

	/**
	 * Creates an observable that streams all events that match the filter
	 * @param filters
	 * @param [onlyNew=false] Only subscribe to new events
	 */
	filters(filters: Filter | Filter[], onlyNew = false): Observable<NostrEvent> {
		filters = Array.isArray(filters) ? filters : [filters];

		return merge(
			// merge existing events
			onlyNew ? EMPTY : from(this.getByFilters(filters)),
			// subscribe to future events
			this.insert$.pipe(filter((e) => matchFilters(filters, e))),
		);
	}

	/** Returns an observable that completes when an event is removed */
	removed(id: string): Observable<never> {
		const deleted = this.checkDeleted(id);
		if (deleted) return EMPTY;

		return this.remove$.pipe(
			// listen for removed events
			filter((e) => e.id === id),
			// complete as soon as we find a matching removed event
			take(1),
			// switch to empty
			mergeMap(() => EMPTY),
		);
	}

	/** Creates an observable that emits when event is updated */
	updated(event: string | NostrEvent): Observable<NostrEvent> {
		return this.database.update$.pipe(
			filter((e) => e.id === event || e === event),
		);
	}

	// Helper methods for creating models

	/** Creates a {@link EventModel} */
	event(id: string): Observable<NostrEvent | undefined> {
		return this.model(EventModel, id);
	}

	/** Creates a {@link ReplaceableModel} */
	replaceable(
		kind: number,
		pubkey: string,
		identifier?: string,
	): Observable<NostrEvent | undefined> {
		return this.model(ReplaceableModel, kind, pubkey, identifier);
	}

	/** Creates a {@link TimelineModel} */
	timeline(
		filters: Filter | Filter[],
		includeOldVersion = false,
	): Observable<NostrEvent[]> {
		return this.model(TimelineModel, filters, includeOldVersion);
	}

	/** Creates a {@link EventsModel} */
	events(ids: string[]): Observable<Record<string, NostrEvent>> {
		return this.model(EventsModel, ids);
	}

	/** Creates a {@link ReplaceableSetModel} */
	replaceableSet(
		pointers: { kind: number; pubkey: string; identifier?: string }[],
	): Observable<Record<string, NostrEvent>> {
		return this.model(ReplaceableSetModel, pointers);
	}

	/** Creates a {@link ProfileModel} */
	profile(pubkey: string) {
		return this.model(ProfileModel, pubkey);
	}

	/** Creates a {@link ContactsModel} */
	contacts(pubkey: string) {
		return this.model(ContactsModel, pubkey);
	}

	/** Creates a {@link MuteModel} */
	mutes(pubkey: string) {
		return this.model(MuteModel, pubkey);
	}

	/** Creates a {@link ReactionsModel} */
	reactions(event: NostrEvent) {
		return this.model(ReactionsModel, event);
	}

	/** Creates a {@link MailboxesModel} */
	mailboxes(pubkey: string) {
		return this.model(MailboxesModel, pubkey);
	}

	/** Creates a {@link UserBlossomServersModel} */
	blossomServers(pubkey: string) {
		return this.model(UserBlossomServersModel, pubkey);
	}

	/** Creates a {@link ThreadModel} */
	thread(root: string | EventPointer | AddressPointer) {
		return this.model(ThreadModel, root);
	}

	/** Creates a {@link CommentsModel} */
	comments(event: NostrEvent) {
		return this.model(CommentsModel, event);
	}
}
