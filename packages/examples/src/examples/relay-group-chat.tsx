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
import { addressPointerLoader } from "applesauce-loaders";
import { QueryStoreProvider } from "applesauce-react";
import { useObservable } from "applesauce-react/hooks";
import { onlyEvents, RelayPool } from "applesauce-relay";
import { NostrEvent } from "nostr-tools";
import { useCallback, useMemo, useState } from "react";
import { map } from "rxjs";

const eventStore = new EventStore();
const queryStore = new QueryStore(eventStore);

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
  const url = `wss://${pointer.relay}`;

  const timeline = useMemo(
    () =>
      pool
        .relay(url)
        .subscription({ kinds: [9], "#h": [pointer.id], limit: 100 })
        .pipe(
          onlyEvents(),
          mapEventsToStore(eventStore),
          mapEventsToTimeline(),
          map((t) => [...t]),
        ),
    [url, pointer?.id],
  );

  const messages = useObservable(timeline);
  const groups = groupMessageEvents(messages ? Array.from(messages).reverse() : []).reverse();

  return (
    <div
      className="flex gap-2 flex-col-reverse overflow-y-auto overflow-x-hidden border p-4 border-base-300 rounded-lg"
      style={{ height: "calc(100vh - 12rem)" }}
    >
      {groups.map((group) => (
        <ChatMessageGroup key={group[0].id} messages={group} />
      ))}
    </div>
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
            </select>
            <button className="btn join-item btn-primary" onClick={() => load(identifier)}>
              Load
            </button>
          </div>
        </div>

        {pointer && <ChatLog pointer={pointer} />}
      </div>
    </QueryStoreProvider>
  );
}
