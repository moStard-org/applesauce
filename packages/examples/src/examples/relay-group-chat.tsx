import { EventStore, mapEventsToStore, mapEventsToTimeline, QueryStore } from "applesauce-core";
import {
  decodeGroupPointer,
  getDisplayName,
  getProfileContent,
  getSeenRelays,
  groupMessageEvents,
  GroupPointer,
  mergeRelaySets,
} from "applesauce-core/helpers";
import { EventFactory } from "applesauce-factory";
import { GroupMessageBlueprint } from "applesauce-factory/blueprints";
import { addressPointerLoader } from "applesauce-loaders/loaders";
import { QueryStoreProvider } from "applesauce-react";
import { useObservable } from "applesauce-react/hooks";
import { onlyEvents, RelayPool } from "applesauce-relay";
import { ExtensionSigner } from "applesauce-signers";
import { NostrEvent } from "nostr-tools";
import { useCallback, useEffect, useMemo, useState } from "react";
import { lastValueFrom, map, startWith } from "rxjs";

const eventStore = new EventStore();
const queryStore = new QueryStore(eventStore);
const signer = new ExtensionSigner();
const factory = new EventFactory({
  signer,
});

const pool = new RelayPool();

const addressLoader = addressPointerLoader(pool.request.bind(pool), {
  eventStore,
  lookupRelays: ["wss://purplepag.es/"],
});

function ChatMessageGroup({ messages }: { messages: NostrEvent[] }) {
  const profile$ = useMemo(
    () => addressLoader({ pubkey: messages[0].pubkey, kind: 0, relays: mergeRelaySets(getSeenRelays(messages[0])) }),
    [messages[0].pubkey],
  );
  const profile = useObservable(profile$);
  const metadata = useMemo(() => profile && getProfileContent(profile), [profile]);

  const time = messages[0].created_at;

  return (
    <div className="chat chat-start">
      <div className="chat-image avatar">
        <div className="w-10 rounded-full">
          <img alt={getDisplayName(profile)} src={metadata?.picture || metadata?.image} />
        </div>
      </div>
      <div className="chat-header">
        {getDisplayName(profile)}
        <time className="text-xs opacity-50">{new Date(time * 1000).toLocaleString()}</time>
      </div>
      <div className="flex flex-col gap-2">
        {messages.map((message) => (
          <div className="chat-bubble">{message.content}</div>
        ))}
      </div>
    </div>
  );
}

function ChatLog({ pointer }: { pointer: GroupPointer }) {
  const timeline = useMemo(
    () =>
      pool
        .relay(pointer.relay)
        .subscription({ kinds: [9], "#h": [pointer.id], limit: 100 })
        .pipe(
          onlyEvents(),
          mapEventsToStore(eventStore),
          mapEventsToTimeline(),
          map((t) => [...t]),
          startWith([]),
        ),
    [pointer.relay, pointer?.id],
  );

  const messages = useObservable(timeline);
  const groups = groupMessageEvents(messages ? Array.from(messages).reverse() : []).reverse();

  return (
    <div
      className="flex gap-2 flex-col-reverse overflow-y-auto overflow-x-hidden border p-4 border-base-300 rounded-lg"
      style={{ height: "calc(100vh - 12rem - 4rem)" }}
    >
      {groups.map((group) => (
        <ChatMessageGroup key={group[0].id} messages={group} />
      ))}
    </div>
  );
}

function SendMessageForm({ pointer }: { pointer: GroupPointer }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Clear the message when the pointer changes
  useEffect(() => setMessage(""), [pointer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !pointer) return;

    setSending(true);
    try {
      // Create a draft for a group message
      const draft = await factory.create(GroupMessageBlueprint, pointer, message);
      // Sign the draft
      const signed = await factory.sign(draft);
      // Publish the message to the relay
      const response = await lastValueFrom(pool.relay(pointer.relay).publish(signed));
      // Throw an error if the message was rejected
      if (!response.ok) throw new Error(response.message);
      // Clear the form
      setMessage("");
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={sending}
        placeholder="Type your message..."
        className="input input-bordered flex-grow"
      />
      <button type="submit" disabled={sending || !message.trim()} className="btn btn-primary">
        {sending ? <span className="loading loading-spinner loading-sm"></span> : "Send"}
      </button>
    </form>
  );
}

export default function RelayGroupExample() {
  const [identifier, setIdentifier] = useState("");
  const [pointer, setPointer] = useState<GroupPointer>();

  const load = useCallback(
    (identifier: string) => {
      try {
        setIdentifier(identifier);
        setPointer(decodeGroupPointer(identifier));
      } catch (error) {}
    },
    [setIdentifier, setPointer],
  );

  return (
    <QueryStoreProvider queryStore={queryStore}>
      <div className="container mx-auto">
        <div className="form-control w-full max-w-xl mb-4">
          <label className="label">
            <span className="label-text">Group Identifier</span>
          </label>
          <div className="join">
            <input
              className="input join-item input-bordered w-full"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter group identifier"
            />
            <select className="select join-item w-xs" onChange={(e) => load(e.target.value)} value={identifier}>
              <option value="">Select group</option>
              <option value="groups.0xchat.com'chachi">chachi</option>
              <option value="groups.hzrd149.com'0a3991">blossom</option>
              <option value="relay.groups.nip29.com'Miz7w4srsmygbqy2">zap.stream</option>
              <option value="groups.0xchat.com'925b1aa20cd1b68dd9a0130e35808d66772fe082cf3f95294dd5755c7ea1ed59">
                Robosats
              </option>
              <option value="groups.hzrd149.com'a45b2f">applesauce</option>
              <option value="groups.hzrd149.com'79dc07">test group</option>
            </select>
            <button className="btn join-item btn-primary" onClick={() => load(identifier)}>
              Load
            </button>
          </div>
        </div>

        {pointer && <ChatLog pointer={pointer} />}
        {pointer && <SendMessageForm pointer={pointer} />}
      </div>
    </QueryStoreProvider>
  );
}
