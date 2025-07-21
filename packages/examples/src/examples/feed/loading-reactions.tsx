import { EventStore, Model } from "applesauce-core";
import {
  getDisplayName,
  getProfilePicture,
  getSeenRelays,
  mergeRelaySets,
  ProfileContent,
} from "applesauce-core/helpers";
import { ReactionsModel } from "applesauce-core/models";
import { createAddressLoader, createReactionsLoader, createTimelineLoader } from "applesauce-loaders/loaders";
import { useObservableMemo } from "applesauce-react/hooks";
import { RelayPool } from "applesauce-relay";
import { kinds, NostrEvent } from "nostr-tools";
import { ProfilePointer } from "nostr-tools/nip19";
import { useEffect, useMemo, useState } from "react";
import { EMPTY, ignoreElements, iif, map, mergeWith } from "rxjs";

import RelayPicker from "../../components/relay-picker";

// Create an event store for all events
const eventStore = new EventStore();

// Create a relay pool to make relay connections
const pool = new RelayPool();

// Create an address loader to load user profiles
const addressLoader = createAddressLoader(pool, {
  // Pass all events to the store
  eventStore,
  // Fallback to lookup relays if profiles cant be found
  lookupRelays: ["wss://purplepag.es"],
});

// Create a tag value loader for reactions (kind 7 events with "e" tags)
const reactionLoader = createReactionsLoader(pool, { eventStore });

/** A model that loads the profile if its not found in the event store */
function ProfileQuery(user: ProfilePointer): Model<ProfileContent | undefined> {
  return (events) =>
    iif(
      // If the profile is not found in the event store, request it
      () => !events.hasReplaceable(kinds.Metadata, user.pubkey),
      addressLoader({ kind: kinds.Metadata, ...user }),
      EMPTY,
    ).pipe(ignoreElements(), mergeWith(events.profile(user.pubkey)));
}

/** Create a hook for loading a users profile */
function useProfile(user: ProfilePointer): ProfileContent | undefined {
  return useObservableMemo(() => eventStore.model(ProfileQuery, user), [user.pubkey, user.relays?.join("|")]);
}

/** Hook to load and group reactions for a specific event */
function useReactions(event: NostrEvent) {
  const reactions = useObservableMemo(
    () =>
      eventStore.model(ReactionsModel, event).pipe(
        map((reactions) =>
          reactions.reduce(
            (acc, reaction) => {
              const content = reaction.content || "+";
              acc[content] = (acc[content] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
        ),
      ),
    [event],
  );

  // Load reactions when component mounts
  useObservableMemo(() => reactionLoader(event), [event]);

  return reactions || {};
}

/** Component to display reaction counts */
function ReactionCounts({ event }: { event: NostrEvent }) {
  const reactions = useReactions(event);

  const reactionEntries = Object.entries(reactions);

  if (reactionEntries.length === 0) {
    return <div className="text-sm text-gray-500 mt-2">No reactions yet</div>;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {reactionEntries.map(([emoji, count]) => (
        <div key={emoji} className="badge badge-outline badge-sm flex items-center gap-1">
          <span>{emoji}</span>
          <span>{count}</span>
        </div>
      ))}
    </div>
  );
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
            <div className="w-10 rounded-full">
              <img src={getProfilePicture(profile, `https://robohash.org/${note.pubkey}.png`)} alt="Profile" />
            </div>
          </div>
          <div className="flex flex-col">
            <h2 className="card-title">{getDisplayName(profile)}</h2>
            <time className="text-sm text-gray-500">{new Date(note.created_at * 1000).toLocaleString()}</time>
          </div>
        </div>
        <p className="mt-2">{note.content}</p>

        {/* Reaction counts */}
        <ReactionCounts event={note} />
      </div>
    </div>
  );
}

export default function FeedWithReactions() {
  const [relay, setRelay] = useState("wss://relay.damus.io/");

  const filter = useMemo(
    () => ({
      kinds: [1],
      authors: ["32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"],
    }),
    [],
  );

  // Create a timeline loader
  const timeline = useMemo(
    () => createTimelineLoader(pool, [relay], filter, { eventStore, limit: 20 }),
    [relay, filter],
  );

  // Load the first page of the timeline on mount
  useEffect(() => {
    timeline().subscribe();
  }, [timeline]);

  // Subscribe to the timeline from the event store
  const feed = useObservableMemo(
    () =>
      eventStore.timeline(filter).pipe(
        // Duplicate the timeline array to make react happy
        map((t) => [...t]),
      ),
    [filter],
  );

  return (
    <div className="container mx-auto my-8 px-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-4">Feed with Reactions</h1>
        <RelayPicker value={relay} onChange={setRelay} />
      </div>

      <div className="flex flex-col gap-4 py-4">
        {feed?.map((event) => <Note key={event.id} note={event} />)}
        <button className="btn btn-primary mx-auto" onClick={() => timeline().subscribe()}>
          Load More
        </button>
      </div>
    </div>
  );
}
