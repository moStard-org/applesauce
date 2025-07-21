import { EventStore, mapEventsToStore, mapEventsToTimeline, Model } from "applesauce-core";
import {
  COMMENT_KIND,
  decodeGroupPointer,
  getDisplayName,
  getProfilePicture,
  getSeenRelays,
  GroupPointer,
  mergeRelaySets,
  ProfileContent,
} from "applesauce-core/helpers";
import { CommentsModel } from "applesauce-core/models";
import { EventFactory } from "applesauce-factory";
import { CommentBlueprint } from "applesauce-factory/blueprints";
import { includeGroupHTag, includeSingletonTag, setShortTextContent } from "applesauce-factory/operations/event";
import { createAddressLoader } from "applesauce-loaders/loaders";
import { useObservableMemo } from "applesauce-react/hooks";
import { onlyEvents, RelayPool } from "applesauce-relay";
import { ExtensionSigner } from "applesauce-signers";
import { kinds, NostrEvent } from "nostr-tools";
import { ProfilePointer } from "nostr-tools/nip19";
import { useCallback, useRef, useState } from "react";
import { defer, EMPTY, ignoreElements, lastValueFrom, map, merge, startWith } from "rxjs";

import GroupPicker from "../../components/group-picker";

const eventStore = new EventStore();
const pool = new RelayPool();

const signer = new ExtensionSigner();
const factory = new EventFactory({ signer });

const addressLoader = createAddressLoader(pool, {
  eventStore,
  lookupRelays: ["wss://purplepag.es/"],
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

function ThreadCard({ event, onSelect }: { event: NostrEvent; onSelect?: (event: NostrEvent) => void }) {
  const profile = useProfile({ pubkey: event.pubkey, relays: mergeRelaySets(getSeenRelays(event)) });

  return (
    <div className="card bg-base-200 shadow-md">
      {onSelect && (
        <button className="btn btn-soft btn-primary absolute top-2 right-2" onClick={() => onSelect(event)}>
          View
        </button>
      )}
      <div className="card-body">
        <div className="flex items-center gap-4">
          <div className="avatar">
            <div className="w-10 rounded-full">
              <img
                alt={getDisplayName(profile)}
                src={getProfilePicture(profile, `https://robohash.org/${event.pubkey}`)}
              />
            </div>
          </div>
          <div>
            <h3 className="font-bold">{event.tags.find((t) => t[0] === "title")?.[1] || "Untitled"}</h3>
            <p className="text-sm opacity-60">
              by {getDisplayName(profile)} • {new Date(event.created_at * 1000).toLocaleString()}
            </p>
          </div>
        </div>
        <p className="mt-2 whitespace-pre-line">{event.content}</p>
      </div>
    </div>
  );
}

function ThreadReply({ event }: { event: NostrEvent }) {
  const raw = useRef<HTMLDialogElement>(null);
  const profile = useProfile({ pubkey: event.pubkey, relays: mergeRelaySets(getSeenRelays(event)) });

  return (
    <div className="chat chat-start">
      <div className="chat-image avatar">
        <div className="w-10 rounded-full">
          <img alt={getDisplayName(profile)} src={getProfilePicture(profile, `https://robohash.org/${event.pubkey}`)} />
        </div>
      </div>
      <div className="chat-header">
        {getDisplayName(profile)}
        <time className="text-xs opacity-50">{new Date(event.created_at * 1000).toLocaleString()}</time>
      </div>
      <div className="chat-bubble whitespace-pre-line">{event.content}</div>

      <span></span>
      <button className="btn btn-link btn-sm" onClick={() => raw.current?.showModal()}>
        View event
      </button>

      <dialog id={`event-${event.id}`} className="modal" ref={raw}>
        <div className="modal-box w-full max-w-6xl">
          <pre className="text-sm">
            <code>{JSON.stringify(event, null, 2)}</code>
          </pre>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}

function ReplyForm({ event, pointer }: { event: NostrEvent; pointer: GroupPointer }) {
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      let draft = await factory.create(CommentBlueprint, event, content);
      // Include the group h tag
      draft = await factory.modify(draft, includeGroupHTag(pointer));
      // Sign the event
      const signed = await factory.sign(draft);
      // Publish the event
      await lastValueFrom(pool.publish([pointer.relay], signed));
      // Add to the event store for the app
      eventStore.add(signed);
      setContent("");
    } catch (error) {
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4 flex-col max-w-xl mx-auto my-4">
      <textarea
        className="textarea textarea-bordered flex-grow w-full"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type your reply..."
        required
      />

      <div className="join ms-auto">
        <button type="submit" disabled={sending} className="btn btn-primary join-item">
          {sending ? <span className="loading loading-spinner loading-sm"></span> : "Send"}
        </button>
      </div>
    </form>
  );
}

/** A component for viewing a thread */
function ThreadView({ event, pointer }: { event: NostrEvent; pointer: GroupPointer }) {
  useObservableMemo(
    () =>
      pool
        .relay(pointer.relay)
        .subscription({ kinds: [COMMENT_KIND], "#h": [pointer.id], "#E": [event.id] })
        .pipe(onlyEvents(), mapEventsToStore(eventStore), mapEventsToTimeline()),
    [pointer.relay, pointer.id, event.id],
  );

  const replies = useObservableMemo(() => eventStore.model(CommentsModel, event), [event.id]);

  return (
    <div>
      <ThreadCard event={event} />
      <div className="mt-8 space-y-4">{replies?.map((reply) => <ThreadReply key={reply.id} event={reply} />)}</div>

      <ReplyForm event={event} pointer={pointer} />
    </div>
  );
}

/** A component for creating a new thread */
function NewThreadForm({
  pointer,
  onCancel,
  onSuccess,
}: {
  pointer: GroupPointer;
  onCancel: () => void;
  onSuccess: (event: NostrEvent) => void;
}) {
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const draft = await factory.build(
        { kind: 11 },
        // Include the "h" tag for the group
        includeGroupHTag(pointer),
        // Set the title
        includeSingletonTag(["title", title]),
        // Set the content and handle hashtags and mentions
        setShortTextContent(content),
      );
      const signed = await factory.sign(draft);
      // Add to the event store for the app
      eventStore.add(signed);
      // Publish the event
      await lastValueFrom(pool.publish([pointer.relay], signed));
      // Add to the event store for the app
      eventStore.add(signed);

      onSuccess(signed);
    } catch (error) {
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4 flex-col max-w-xl mx-auto my-4">
      <input
        type="text"
        className="input input-bordered flex-grow w-full"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        required
      />
      <textarea
        className="textarea textarea-bordered flex-grow w-full"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type your message..."
        required
      />

      <div className="join ms-auto">
        <button type="button" disabled={sending} className="btn btn-ghost join-item" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={sending} className="btn btn-primary join-item">
          {sending ? <span className="loading loading-spinner loading-sm"></span> : "Send"}
        </button>
      </div>
    </form>
  );
}

/** A component for listing threads */
function ThreadsList({ pointer, onSelect }: { pointer: GroupPointer; onSelect: (event: NostrEvent) => void }) {
  const threads = useObservableMemo(
    () =>
      pool
        .relay(pointer.relay)
        .subscription({ kinds: [11], "#h": [pointer.id] })
        .pipe(
          onlyEvents(),
          mapEventsToStore(eventStore),
          mapEventsToTimeline(),
          map((t) => [...t]),
          startWith([] as NostrEvent[]),
        ),
    [pointer.relay, pointer.id],
  );

  return (
    <div className="space-y-4">
      {threads?.map((thread) => <ThreadCard key={thread.id} event={thread} onSelect={onSelect} />)}
    </div>
  );
}

export default function ThreadsExample() {
  const [identifier, setIdentifier] = useState("");
  const [pointer, setPointer] = useState<GroupPointer>();
  const [selectedThread, setSelectedThread] = useState<NostrEvent>();

  const [createThread, setCreateThread] = useState(false);

  const setGroup = useCallback(
    (identifier: string) => {
      try {
        setIdentifier(identifier);
        setPointer(decodeGroupPointer(identifier));
        setSelectedThread(undefined);
      } catch (error) {}
    },
    [setIdentifier, setPointer],
  );

  return (
    <div className="container mx-auto my-8">
      <div className="mb-4 flex w-full  gap-2">
        <GroupPicker identifier={identifier} setIdentifier={setGroup} />

        {pointer && !createThread && !selectedThread && (
          <button className="btn btn-primary ms-auto" onClick={() => setCreateThread(true)}>
            New Thread
          </button>
        )}
      </div>

      {pointer && createThread && !selectedThread && (
        <NewThreadForm
          pointer={pointer}
          onCancel={() => setCreateThread(false)}
          onSuccess={() => setCreateThread(false)}
        />
      )}

      {pointer && !selectedThread && <ThreadsList pointer={pointer} onSelect={setSelectedThread} />}
      {pointer && selectedThread && (
        <>
          <button className="btn btn-ghost mb-4" onClick={() => setSelectedThread(undefined)}>
            ← Back to Threads
          </button>
          <ThreadView event={selectedThread} pointer={pointer} />
        </>
      )}
    </div>
  );
}
