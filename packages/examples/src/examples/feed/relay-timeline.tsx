import { EventStore, mapEventsToStore, mapEventsToTimeline, QueryStore } from "applesauce-core";
import { getDisplayName, getProfilePicture, getSeenRelays } from "applesauce-core/helpers";
import { addressPointerLoader } from "applesauce-loaders/loaders";
import { useObservable } from "applesauce-react/hooks";
import { onlyEvents, RelayPool } from "applesauce-relay";
import { NostrEvent } from "nostr-tools";
import { useEffect, useMemo, useState } from "react";
import { map } from "rxjs";

import { RelayPicker } from "../../components/relay-picker";

// Create an event store for all events
const eventStore = new EventStore();
const queryStore = new QueryStore(eventStore);

// Create a relay pool to make relay connections
const pool = new RelayPool();

// Create an address loader to load user profiles
const addressLoader = addressPointerLoader(pool.request.bind(pool), {
  // Pass all events to the store
  eventStore,
  // Make the cache requests attempt to load from a local relay
  cacheRequest: (filters) => pool.relay("ws://localhost:4869").request(filters),
  // Fallback to lookup relays if profiles cant be found
  lookupRelays: ["wss://purplepag.es"],
});

function Note({ note }: { note: NostrEvent }) {
  // Subscribe to the request and wait for the profile event
  const profile = useObservable(queryStore.profile(note.pubkey));

  // Load the profile if its not already loaded
  useEffect(() => {
    if (profile) return;

    // Get the relays the event was from
    const relays = getSeenRelays(note);
    // Make a request to the address loader for the users profile
    addressLoader({ kind: 0, pubkey: note.pubkey, relays: relays && Array.from(relays) }).subscribe();
  }, [note.pubkey, profile]);

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <div className="flex items-center gap-4">
          <div className="avatar">
            <div className="w-12 rounded-full">
              <img src={getProfilePicture(profile, `https://robohash.org/${note.pubkey}.png`)} alt="Profile" />
            </div>
          </div>
          <h2 className="card-title">{getDisplayName(profile)}</h2>
        </div>
        <p>{note.content}</p>
      </div>
    </div>
  );
}

export default function RelayTimeline() {
  const [relay, setRelay] = useState("wss://relay.devvul.com");

  // Create a timeline observable
  const timeline$ = useMemo(
    () =>
      pool
        .relay(relay)
        .subscription({ kinds: [1] })
        .pipe(
          // Only get events from relay (ignore EOSE)
          onlyEvents(),
          // deduplicate events using the event store
          mapEventsToStore(eventStore),
          // collect all events into a timeline
          mapEventsToTimeline(),
          // Duplicate the timeline array to make react happy
          map((t) => [...t]),
        ),
    [relay],
  );

  // Subscribe to the timeline and get the events
  const events = useObservable(timeline$);

  return (
    <div className="container mx-auto px-4">
      <RelayPicker value={relay} onChange={setRelay} />

      <div className="flex flex-col gap-4 py-4">{events?.map((event) => <Note key={event.id} note={event} />)}</div>
    </div>
  );
}
