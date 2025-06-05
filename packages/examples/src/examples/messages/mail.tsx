import { ProxySigner } from "applesauce-accounts";
import { ActionHub } from "applesauce-actions";
import { ReplyToWrappedMessage } from "applesauce-actions/actions";
import { defined, EventStore } from "applesauce-core";
import {
  getWrappedMessageParent,
  isGiftWrapLocked,
  persistEncryptedContent,
  Rumor,
  unlockGiftWrap,
} from "applesauce-core/helpers";
import { GiftWrapsModel, WrappedMessagesModel } from "applesauce-core/models";
import { EventFactory } from "applesauce-factory";
import { timelineLoader } from "applesauce-loaders/loaders";
import { useObservableMemo, useObservableState } from "applesauce-react/hooks";
import { RelayPool } from "applesauce-relay";
import { ExtensionSigner } from "applesauce-signers";
import { kinds } from "nostr-tools";
import { npubEncode } from "nostr-tools/nip19";
import { useEffect, useMemo, useState } from "react";
import { BehaviorSubject, lastValueFrom, map } from "rxjs";

// Import helper components
import LoginView from "../../components/login-view";
import RelayPicker from "../../components/relay-picker";
import UnlockView from "../../components/unlock-view";

import SecureStorage from "../../extra/encrypted-storage";

const storage$ = new BehaviorSubject<SecureStorage | null>(null);
const signer$ = new BehaviorSubject<ExtensionSigner | null>(null);
const pubkey$ = new BehaviorSubject<string | null>(null);
const eventStore = new EventStore();
const pool = new RelayPool();
const factory = new EventFactory({ signer: new ProxySigner(signer$.pipe(defined())) });
const actions = new ActionHub(eventStore, factory);

// Persist encrypted content
persistEncryptedContent(eventStore, storage$.pipe(defined()));

function ReplyForm({ parent, onClose, relay }: { parent: Rumor; onClose: () => void; relay: string }) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setSending(true);

      // Send the reply and publish gift wrapped messages
      await actions
        .exec(ReplyToWrappedMessage, parent, content.trim())
        .forEach((gift) => lastValueFrom(pool.publish([relay], gift)));

      setContent("");
      onClose();
    } catch (err) {
      console.error("Failed to send reply:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card bg-base-200 p-4">
      <textarea
        className="textarea textarea-bordered w-full"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type your reply..."
        rows={4}
      />
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={sending || !content.trim()}>
          {sending ? "Sending..." : "Send Reply"}
        </button>
      </div>
    </form>
  );
}

function Message({ message, pubkey, relay }: { message: Rumor; pubkey: string; relay: string }) {
  const [reply, setReply] = useState(false);

  return (
    <div key={message.id} className={`card bg-base-100 shadow-md ${message.pubkey === pubkey ? "ml-12" : "mr-12"}`}>
      <div className="card-body">
        <div className="flex justify-between items-center">
          <span className="font-bold">{npubEncode(message.pubkey)}</span>
          {message.tags.find((t) => t[0] === "e") && <span className="text-sm opacity-50">Reply</span>}
        </div>

        <p className="whitespace-pre-wrap">{message.content}</p>
        <div className="card-actions justify-end mt-4">
          <button className="btn btn-ghost btn-sm" onClick={() => setReply(true)}>
            Reply
          </button>
        </div>
      </div>

      {reply && <ReplyForm parent={message} onClose={() => setReply(false)} relay={relay} />}
    </div>
  );
}

function InboxView({ pubkey }: { pubkey: string }) {
  const [relay, setRelay] = useState<string>("wss://relay.damus.io/");
  const [selectedThread, setSelectedThread] = useState<Rumor | null>(null);

  // Create a loader that loads all gift wraps for a pubkey
  const timeline = useMemo(
    () =>
      timelineLoader(pool.request.bind(pool), [relay], [{ kinds: [kinds.GiftWrap], "#p": [pubkey] }], { eventStore }),
    [relay, pubkey],
  );

  // load the first page of events
  useEffect(() => {
    timeline().subscribe();
  }, [timeline]);

  // Get all locked gift wraps
  const pending = useObservableMemo(() => eventStore.model(GiftWrapsModel, pubkey, true), [pubkey]);

  const signer = useObservableState(signer$);
  const [decrypting, setDecrypting] = useState(false);
  const decryptPending = async () => {
    if (!pending || !signer) return;
    try {
      setDecrypting(true);
      for (const giftwrap of pending) if (isGiftWrapLocked(giftwrap)) await unlockGiftWrap(giftwrap, signer);
    } catch (error) {
      // Stop of first error
    }
    setDecrypting(false);
  };

  // Select all unlocked gift wraps
  const threads = useObservableMemo(
    () =>
      eventStore
        .model(WrappedMessagesModel, pubkey)
        .pipe(map((messages) => messages.filter((message) => !getWrappedMessageParent(message)))),
    [pubkey],
  );

  return (
    <div
      className="container mx-auto p-4 overflow-hidden box-border"
      style={{ height: "calc(100vh - var(--spacing) * 16)" }}
    >
      <div className="mb-4 flex gap-4">
        <RelayPicker value={relay} onChange={setRelay} />

        {pending && pending.length > 0 && (
          <button className="btn btn-primary ms-auto" onClick={decryptPending} disabled={decrypting}>
            Decrypt pending ({pending.length}){" "}
            {decrypting && <span className="loading loading-spinner loading-xs"></span>}
          </button>
        )}
      </div>

      <div className="flex gap-4 overflow-hidden h-full">
        {/* Inbox List */}
        <div className="w-1/3 flex-shrink-0divide-y overflow-y-auto overflow-x-hidden h-full">
          {threads?.map((message) => (
            <div
              key={message.id}
              className={`py-4 cursor-pointer hover:bg-base-200 flex gap-2 overflow-hidden ${
                selectedThread?.id === message.id ? "bg-base-200" : ""
              }`}
              onClick={() => setSelectedThread(message)}
            >
              <div className="avatar">
                <div className="w-10 rounded">
                  <img src={`https://robohash.org/${message.pubkey}`} />
                </div>
              </div>
              <div className="overflow-hidden w-full">
                <div className="font-bold truncate">{npubEncode(message.pubkey)}</div>
                <div className="text-sm opacity-50">{new Date(message.created_at * 1000).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Thread */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
          {selectedThread ? (
            <div className="card bg-base-100">
              <div className="card-body">
                <Message message={selectedThread} pubkey={pubkey} relay={relay} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-base-content/50">
              Select a message to view the thread
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const storage = useObservableState(storage$);
  const signer = useObservableState(signer$);
  const pubkey = useObservableState(pubkey$);

  const handleUnlock = async (storage: SecureStorage, pubkey?: string) => {
    storage$.next(storage);

    if (pubkey) {
      pubkey$.next(pubkey);
      signer$.next(new ExtensionSigner());
    }
  };

  const handleLogin = async (signer: ExtensionSigner, pubkey: string) => {
    signer$.next(signer);
    pubkey$.next(pubkey);
    if (storage) await storage.setItem("pubkey", pubkey);
  };

  // Show unlock view if storage is not initialized
  if (!storage) return <UnlockView onUnlock={handleUnlock} />;

  // Show login view if not logged in
  if (!signer || !pubkey) return <LoginView onLogin={handleLogin} />;

  // Show main inbox view when both storage and login are ready
  return <InboxView pubkey={pubkey} />;
}

export default App;
