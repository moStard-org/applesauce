import { EventStore, mapEventsToStore, mapEventsToTimeline, QueryStore } from "applesauce-core";
import {
  addRelayHintsToPointer,
  getDisplayName,
  getProfilePicture,
  getSeenRelays,
  getZapEventPointer,
  getZapPayment,
  getZapSender,
  isFromCache,
  mergeRelaySets,
} from "applesauce-core/helpers";
import { ProfileQuery } from "applesauce-core/queries";
import { addressPointerLoader, eventPointerLoader } from "applesauce-loaders/loaders";
import { useObservable } from "applesauce-react/hooks";
import { onlyEvents, RelayPool } from "applesauce-relay";
import { addEvents, getEventsForFilters, openDB } from "nostr-idb";
import { Filter, kinds, NostrEvent } from "nostr-tools";
import { useEffect, useMemo, useState } from "react";
import { bufferTime, filter, map } from "rxjs";

import { RelayPicker } from "../../components/relay-picker";

// Setup event store
const eventStore = new EventStore();
const queryStore = new QueryStore(eventStore);

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

// Create loaders that load events from relays and cache
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

function ZapEvent({ event }: { event: NostrEvent }) {
  const pointer = getZapEventPointer(event) ?? undefined;
  const payment = getZapPayment(event);
  const senderPubkey = getZapSender(event);
  const zapAmount = payment?.amount ? Math.round(payment.amount / 1000) : 0; // Convert msats to sats

  // Load the shared event from the pointer
  useEffect(() => {
    if (!pointer) return;
    const sub = eventLoader(
      // Add extra relay hints to the pointer to load
      addRelayHintsToPointer(pointer, getSeenRelays(event)),
    ).subscribe();
    return () => sub.unsubscribe();
  }, [pointer, event]);

  const relays = useMemo(() => mergeRelaySets(getSeenRelays(event), pointer?.relays), [event, pointer]);

  const zappedEvent = useObservable(pointer && queryStore.event(pointer.id));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        <Avatar pubkey={senderPubkey} relays={relays} />
        <h2>
          <span className="font-bold">
            <Username pubkey={senderPubkey} relays={relays} />
          </span>
          <span> zapped </span>
          <span className="text-warning font-bold">{zapAmount} sats</span>
        </h2>
        <time className="ms-auto text-sm text-gray-500">{new Date(event.created_at * 1000).toLocaleString()}</time>
      </div>

      {zappedEvent ? (
        <div className="card card-sm bg-base-100 shadow-md">
          <div className="card-body">
            <div className="flex items-center gap-4">
              <Avatar pubkey={zappedEvent.pubkey} relays={relays} />
              <h2 className="card-title">
                <Username pubkey={zappedEvent.pubkey} relays={relays} />
              </h2>
            </div>
            <p>{zappedEvent.content}</p>
          </div>
        </div>
      ) : pointer ? (
        <div className="card card-sm bg-base-200 shadow-md opacity-50">
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
        <div className="card card-sm bg-error text-error-content shadow-md">
          <div className="card-body">
            <p>Invalid zap: no event pointer found</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ZapsTimeline() {
  const [relay, setRelay] = useState<string>("wss://relay.primal.net/");

  const timeline$ = useMemo(
    () =>
      pool
        .relay(relay)
        .subscription({ kinds: [kinds.Zap], limit: 20 })
        .pipe(
          onlyEvents(),
          mapEventsToStore(eventStore),
          mapEventsToTimeline(),
          map((events) => [...events]),
        ),
    [relay],
  );
  const zaps = useObservable(timeline$);

  return (
    <div className="container mx-auto">
      <div className="flex gap-2 mb-4">
        <RelayPicker value={relay} onChange={setRelay} />
      </div>

      <div className="flex flex-col gap-4">{zaps?.map((event) => <ZapEvent key={event.id} event={event} />)}</div>
    </div>
  );
}
