import { EventStore, mapEventsToStore, mapEventsToTimeline } from "applesauce-core";
import { getDisplayName, getProfilePicture, getSeenRelays } from "applesauce-core/helpers";
import { createAddressLoader } from "applesauce-loaders";
import { useObservable } from "applesauce-react/hooks";
import { onlyEvents, RelayPool } from "applesauce-relay";
import { NostrEvent } from "nostr-tools";
import { useMemo, useState } from "react";
import { map } from "rxjs";

// Create an event store for all events
const eventStore = new EventStore();

// Create a relay pool to make relay connections
const pool = new RelayPool();

// Create an address loader to load user profiles
const addressLoader = createAddressLoader(pool.request.bind(pool), {
  // Make the cache requests attempt to load from a local relay
  cacheRequest: (filters) => pool.relay("ws://localhost:4869").request(filters),
  // Fallback to lookup relays if profiles cant be found
  lookupRelays: ["wss://purplepag.es"],
});

function Note({ note }: { note: NostrEvent }) {
  const profile$ = useMemo(() => {
    // Get the relays the event was from
    const relays = getSeenRelays(note);
    // Make a request to the address loader for the users profile
    return addressLoader({ kind: 0, pubkey: note.pubkey, relays: relays && Array.from(relays) });
  }, [note.pubkey]);

  // Subscribe to the request and wait for the profile event
  const profile = useObservable(profile$);

  return (
    <div className="card bg-base-100 shadow-xl">
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
      <div className="tabs tabs-lift">
        <a
          className={`tab ${relay === "wss://relay.devvul.com" ? "tab-active" : ""}`}
          onClick={() => setRelay("wss://relay.devvul.com")}
        >
          relay.devvul.com
        </a>
        <a
          className={`tab ${relay === "wss://relay.damus.io" ? "tab-active" : ""}`}
          onClick={() => setRelay("wss://relay.damus.io")}
        >
          relay.damus.io
        </a>
        <a className={`tab ${relay === "wss://nos.lol" ? "tab-active" : ""}`} onClick={() => setRelay("wss://nos.lol")}>
          nos.lol
        </a>
      </div>

      <div className="flex flex-col gap-4 py-4">{events?.map((event) => <Note key={event.id} note={event} />)}</div>
    </div>
  );
}
