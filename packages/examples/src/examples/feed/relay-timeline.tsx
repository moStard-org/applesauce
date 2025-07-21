import { EventStore, mapEventsToStore, mapEventsToTimeline, Model } from "applesauce-core";
import {
  getDisplayName,
  getProfilePicture,
  getSeenRelays,
  mergeRelaySets,
  ProfileContent,
} from "applesauce-core/helpers";
import { createAddressLoader } from "applesauce-loaders/loaders";
import { useObservableMemo } from "applesauce-react/hooks";
import { onlyEvents, RelayPool } from "applesauce-relay";
import { kinds, NostrEvent } from "nostr-tools";
import { ProfilePointer } from "nostr-tools/nip19";
import { useMemo, useState } from "react";
import { defer, EMPTY, ignoreElements, map, merge } from "rxjs";

import RelayPicker from "../../components/relay-picker";

// Create an event store for all events
const eventStore = new EventStore();

// Create a relay pool to make relay connections
const pool = new RelayPool();

// Create an address loader to load user profiles
const addressLoader = createAddressLoader(pool, {
  // Pass all events to the store
  eventStore,
  // Make the cache requests attempt to load from a local relay
  cacheRequest: (filters) => pool.relay("ws://localhost:4869").request(filters),
  // Fallback to lookup relays if profiles cant be found
  lookupRelays: ["wss://purplepag.es"],
});

/** A model that loads the profile if its not found in the event store */
function ProfileQuery(user: ProfilePointer): Model<ProfileContent | undefined> {
  return (events) =>
    merge(
      // Load the profile if its not found in the event store
      defer(() => {
        if (events.hasReplaceable(kinds.Metadata, user.pubkey)) return EMPTY;
        else return addressLoader({ kind: kinds.Metadata, ...user }).pipe(ignoreElements());
      }),
      // Subscribe to the profile content
      events.profile(user.pubkey),
    );
}

/** Create a hook for loading a users profile */
function useProfile(user: ProfilePointer): ProfileContent | undefined {
  return useObservableMemo(() => eventStore.model(ProfileQuery, user), [user.pubkey, user.relays?.join("|")]);
}

function Note({ note }: { note: NostrEvent }) {
  // Subscribe to the request and wait for the profile event
  const profile = useProfile(
    useMemo(() => ({ pubkey: note.pubkey, relays: mergeRelaySets(getSeenRelays(note)) }), [note]),
  );

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
  const events = useObservableMemo(
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

  return (
    <div className="container mx-auto my-8 px-4">
      <RelayPicker value={relay} onChange={setRelay} />

      <div className="flex flex-col gap-4 py-4">{events?.map((event) => <Note key={event.id} note={event} />)}</div>
    </div>
  );
}
