import { EventStore, mapEventsToStore, mapEventsToTimeline, QueryStore } from "applesauce-core";
import {
  decodeGroupPointer,
  getDisplayName,
  getProfileContent,
  getSeenRelays,
  GroupPointer,
  mergeRelaySets,
} from "applesauce-core/helpers";
import { createAddressLoader } from "applesauce-loaders";
import { QueryStoreProvider } from "applesauce-react";
import { useObservable } from "applesauce-react/hooks";
import { onlyEvents, RelayPool } from "applesauce-relay";
import { NostrEvent } from "nostr-tools";
import { useCallback, useMemo, useState } from "react";
import { map } from "rxjs";

const eventStore = new EventStore();
const queryStore = new QueryStore(eventStore);

const pool = new RelayPool();

const addressLoader = createAddressLoader(pool.request.bind(pool), {
  eventStore,
  lookupRelays: ["wss://purplepag.es/"],
});

function ChatMessage({ message }: { message: NostrEvent }) {
  const profile$ = useMemo(
    () => addressLoader({ pubkey: message.pubkey, kind: 0, relays: mergeRelaySets(getSeenRelays(message)) }),
    [message.pubkey],
  );
  const profile = useObservable(profile$);
  const metadata = useMemo(() => profile && getProfileContent(profile), [profile]);

  return (
    <div className="chat chat-start">
      <div className="chat-image avatar">
        <div className="w-10 rounded-full">
          <img alt={getDisplayName(profile)} src={metadata?.picture || metadata?.image} />
        </div>
      </div>
      <div className="chat-header">
        {getDisplayName(profile)}
        <time className="text-xs opacity-50">{new Date(message.created_at * 1000).toLocaleString()}</time>
      </div>
      <div className="chat-bubble">{message.content}</div>
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

  return (
    <div className="flex flex-col gap-2 max-w-full overflow-x-hidden overflow-y-auto h-full">
      {messages?.map((message) => <ChatMessage key={message.id} message={message} />)}
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
        <div className="form-control w-full max-w-xl">
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
              <option defaultValue="">Select group</option>
              <option value="groups.0xchat.com'chachi">chachi</option>
              <option value="groups.hzrd149.com'0a3991">blossom</option>
              <option value="relay.groups.nip29.com'Miz7w4srsmygbqy2">zap.stream</option>
            </select>
            <button className="btn join-item btn-primary" onClick={() => load(identifier)}>
              Load
            </button>
          </div>
          <label className="label">
            <span className="label-text-alt">The NIP-29 group identifier</span>
          </label>
        </div>

        {pointer && <ChatLog pointer={pointer} />}
      </div>
    </QueryStoreProvider>
  );
}
