import { EventStore, mapEventsToStore, mapEventsToTimeline, QueryStore } from "applesauce-core";
import {
  addRelayHintsToPointer,
  getDisplayName,
  getProfilePicture,
  getReactionEventPointer,
  getSeenRelays,
  isFromCache,
  mergeRelaySets,
} from "applesauce-core/helpers";
import { ProfileQuery } from "applesauce-core/queries";
import { addressPointerLoader, eventPointerLoader } from "applesauce-loaders/loaders";
import { useObservable } from "applesauce-react/hooks";
import { onlyEvents, RelayPool } from "applesauce-relay";
import { getEventsForFilters, openDB, addEvents } from "nostr-idb";
import { Filter, kinds, NostrEvent } from "nostr-tools";
import { useEffect, useMemo, useState } from "react";
import { bufferTime, filter, map } from "rxjs";

import { RelayPicker } from "../../components/relay-picker";

// Setup event store
const eventStore = new EventStore();
const queryStore = new QueryStore(eventStore);

// Create a relay pool for connections
const pool = new RelayPool();

// Setup a local event cache
const cache = await openDB();
function cacheRequest(filters: Filter[]) {
  return getEventsForFilters(cache, filters).then((events) => {
    console.log("loaded events from cache", events.length);
    return events;
  });
}

// Save all new events to the cache
eventStore.inserts
  .pipe(
    // Only select events that are not from the cache
    filter((e) => !isFromCache(e)),
    // Buffer events for 5 seconds
    bufferTime(5_000),
    // Only select buffers with events
    filter((b) => b.length > 0),
  )
  .subscribe((events) => {
    // Save all new events to the cache
    addEvents(cache, events).then(() => {
      console.log("Saved events to cache", events.length);
    });
  });

// Create some loaders using the cache method and the event store
const addressLoader = addressPointerLoader(pool.request.bind(pool), {
  eventStore,
  cacheRequest,
  lookupRelays: ["wss://purplepag.es/"],
});
const eventLoader = eventPointerLoader(pool.request.bind(pool), { eventStore, cacheRequest });

/** A hook for loading profiles */
function useProfile(pubkey: string, relays?: string[]) {
  const observable$ = useMemo(() => {
    // Request the profile if it's not in the store
    if (!eventStore.hasReplaceable(0, pubkey)) addressLoader({ kind: 0, pubkey, relays }).subscribe();

    return queryStore.createQuery(ProfileQuery, pubkey);
  }, [pubkey, relays?.join(",")]);

  return useObservable(observable$);
}

/** A component for rendering user avatars */
function Avatar({ pubkey, relays }: { pubkey: string; relays?: string[] }) {
  const profile = useProfile(pubkey, relays);

  return (
    <div className="avatar">
      <div className="w-8 rounded-full">
        <img src={getProfilePicture(profile, `https://robohash.org/${pubkey}.png`)} />
      </div>
    </div>
  );
}

/** A component for rendering usernames */
function Username({ pubkey, relays }: { pubkey: string; relays?: string[] }) {
  const profile = useProfile(pubkey, relays);

  return <>{getDisplayName(profile, "unknown")}</>;
}

function ReactionEvent({ event }: { event: NostrEvent }) {
  const pointer = getReactionEventPointer(event);

  const relays = useMemo(() => {
    return mergeRelaySets(getSeenRelays(event), pointer?.relays);
  }, [event, pointer]);

  // Load the shared event from the pointer
  useEffect(() => {
    if (!pointer) return;
    const sub = eventLoader(
      // Add extra relay hints to the pointer to load
      addRelayHintsToPointer(pointer, getSeenRelays(event)),
    ).subscribe();
    return () => sub.unsubscribe();
  }, [pointer, event]);

  const reactedTo = useObservable(pointer && queryStore.event(pointer.id));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        <Avatar pubkey={event.pubkey} relays={relays} />
        <h2>
          <span className="font-bold">
            <Username pubkey={event.pubkey} relays={relays} />
          </span>
          <span> reacted {event.content} to</span>
        </h2>
        <time className="ms-auto text-sm text-gray-500">{new Date(event.created_at * 1000).toLocaleString()}</time>
      </div>

      {reactedTo ? (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <div className="flex items-center gap-4">
              <Avatar pubkey={reactedTo.pubkey} relays={relays} />
              <h2 className="card-title">
                <Username pubkey={reactedTo.pubkey} relays={relays} />
              </h2>
            </div>
            <p>{reactedTo.content}</p>
          </div>
        </div>
      ) : pointer ? (
        <div className="card bg-base-200 shadow-md opacity-50">
          <div className="card-body">
            <div className="flex items-center gap-4">
              <span className="loading loading-dots loading-lg" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-mono">Loading event: {pointer.id}</p>
                {pointer.relays && pointer.relays.length > 0 && (
                  <p className="text-xs text-gray-500">Checking relays: {pointer.relays.join(", ")}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card bg-error text-error-content shadow-md">
          <div className="card-body">
            <p>Invalid reaction: no event pointer found</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReactionsTimeline() {
  const [relay, setRelay] = useState<string>("wss://relay.primal.net/");

  const timeline$ = useMemo(
    () =>
      pool
        .relay(relay)
        .subscription({ kinds: [kinds.Reaction], limit: 20 })
        .pipe(
          onlyEvents(),
          mapEventsToStore(eventStore),
          mapEventsToTimeline(),
          map((events) => [...events]),
        ),
    [relay],
  );
  const reactions = useObservable(timeline$);

  return (
    <div className="container mx-auto">
      <div className="flex gap-2 mb-4">
        <RelayPicker value={relay} onChange={setRelay} />
      </div>

      <div className="flex flex-col gap-4">
        {reactions?.map((event) => <ReactionEvent key={event.id} event={event} />)}
      </div>
    </div>
  );
}
