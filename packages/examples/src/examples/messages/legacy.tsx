import { defined, EventStore } from "applesauce-core";
import {
  getEncryptedContent,
  getTagValue,
  lockEncryptedContent,
  setEncryptedContentCache,
  unlockEncryptedContent,
} from "applesauce-core/helpers";
import { EventFactory } from "applesauce-factory";
import { includeSingletonTag, setEncryptedContent } from "applesauce-factory/operations/event";
import { timelineLoader } from "applesauce-loaders/loaders";
import { useObservable } from "applesauce-react/hooks";
import { RelayPool } from "applesauce-relay";
import { ExtensionSigner } from "applesauce-signers";
import localforage from "localforage";
import { Filter, NostrEvent } from "nostr-tools";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BehaviorSubject, lastValueFrom, map } from "rxjs";

import { ProxySigner } from "../../../../accounts/dist/proxy-signer";
import { RelayPicker } from "../../components/relay-picker";
import SecureStorage from "../../extra/encrypted-storage";

const signer$ = new BehaviorSubject<ExtensionSigner | null>(null);
const eventStore = new EventStore();
const pool = new RelayPool();
const factory = new EventFactory({ signer: new ProxySigner(signer$.pipe(defined())) });

function UnlockView({ onUnlock }: { onUnlock: (storage: SecureStorage, pubkey?: string) => void }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const storage = new SecureStorage(localforage);
      const isValid = await storage.unlock(pin);

      if (!isValid) return setError("Invalid PIN");

      const pubkey = (await storage.getItem<string>("pubkey")) ?? undefined;
      onUnlock(storage, pubkey);
    } catch (err) {
      setError("Failed to unlock storage");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => localforage.clear();

  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <form onSubmit={handleUnlock} className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Unlock Storage</h2>
          <div className="form-control">
            <input
              type="password"
              placeholder="Enter PIN"
              className="input input-bordered"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && <div className="text-error text-sm">{error}</div>}
          <div className="card-actions justify-between">
            <button type="button" className="btn btn-primary" onClick={handleClear}>
              Clear
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !pin}>
              {loading ? <span className="loading loading-spinner" /> : "Unlock"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function LoginView({ onLogin }: { onLogin: (signer: ExtensionSigner, pubkey: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const signer = new ExtensionSigner();
      const pubkey = await signer.getPublicKey();

      onLogin(signer, pubkey);
    } catch (err) {
      setError("Failed to login with extension");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Login Required</h2>
          <p>Please login with your Nostr extension</p>
          {error && <div className="text-error text-sm">{error}</div>}
          <div className="card-actions justify-end">
            <button onClick={handleLogin} className="btn btn-primary" disabled={loading}>
              {loading ? <span className="loading loading-spinner" /> : "Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactList({
  events,
  pubkey,
  onSelect,
}: {
  events: NostrEvent[];
  pubkey: string;
  onSelect: (pubkey: string) => void;
}) {
  const contacts = useMemo(() => {
    return events
      .filter((e) => e.kind === 4)
      .map((event) => {
        const sender = event.pubkey;
        const recipient = getTagValue(event, "p");
        if (recipient === pubkey) return sender;
        else if (sender === pubkey) return recipient;
        else return undefined;
      })
      .filter((p) => p !== undefined)
      .reduce((arr, p) => {
        if (arr.includes(p)) return arr;
        else return [...arr, p];
      }, [] as string[]);
  }, [events, pubkey]);

  return (
    <div className="flex flex-col gap-2">
      {contacts.map((pubkey) => (
        <button key={pubkey} onClick={() => onSelect(pubkey)} className="btn btn-ghost justify-start w-full">
          {pubkey.slice(0, 8)}...
        </button>
      ))}
    </div>
  );
}

function Message({
  pubkey,
  message,
  storage,
  signer,
}: {
  pubkey: string;
  message: NostrEvent;
  storage: SecureStorage;
  signer: ExtensionSigner;
}) {
  const sender = message.pubkey;
  const content = useObservable(
    useMemo(() => eventStore.updated(message.id).pipe(map(getEncryptedContent)), [message.id]),
  );
  const decrypt = async () => {
    // Check if the plaintext was cached
    const cached = await storage.getItem<string>(message.id);
    if (cached) return setEncryptedContentCache(message, cached);

    const corraspondant = sender === pubkey ? getTagValue(message, "p") : sender;
    if (!corraspondant) throw new Error("No corraspondant found");

    // Decrypt the message using the signer
    const content = await unlockEncryptedContent(message, corraspondant, signer);
    await storage.setItem(message.id, content);
  };

  // Load plaintext from cache
  useEffect(() => {
    storage.getItem<string>(message.id).then((cached) => {
      if (cached) setEncryptedContentCache(message, cached);
    });
  }, [message.id]);

  return (
    <div>
      <span className={`font-bold ${sender === pubkey ? "text-primary" : "text-secondary"}`}>{sender.slice(0, 8)}</span>
      :{" "}
      {content || (
        <button className="btn btn-link" onClick={decrypt}>
          decrypt
        </button>
      )}
    </div>
  );
}

function DirectMessageForm({ corraspondant, relay }: { corraspondant: string; relay: string }) {
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      setSending(true);
      const draft = await factory.build(
        { kind: 4 },
        includeSingletonTag(["p", corraspondant]),
        setEncryptedContent(corraspondant, message, "nip04"),
      );
      const signed = await factory.sign(draft);
      await lastValueFrom(pool.publish([relay], signed));

      // Set the encrypted content cache and add to store
      setEncryptedContentCache(signed, message);
      eventStore.add(signed);
      setMessage("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
    setSending(false);
  };

  return (
    <form onSubmit={handleSend} className="flex gap-2 mt-4">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={sending}
        placeholder="Type your message..."
        className="input input-bordered flex-grow"
      />
      <button type="submit" className="btn btn-primary" disabled={sending}>
        Send
      </button>
    </form>
  );
}

function DirectMessageView({
  pubkey,
  corraspondant,
  relay,
  storage,
  signer,
}: {
  pubkey: string;
  corraspondant: string;
  relay: string;
  storage: SecureStorage;
  signer: ExtensionSigner;
}) {
  const filters = useMemo<Filter[]>(
    () => [
      { kinds: [4], authors: [corraspondant], "#p": [pubkey] },
      { kinds: [4], authors: [pubkey], "#p": [corraspondant] },
    ],
    [corraspondant, pubkey],
  );

  const loader$ = useMemo(
    () => timelineLoader(pool.request.bind(pool), [relay], filters, { eventStore }),
    [relay, corraspondant, pubkey],
  );
  useEffect(() => {
    loader$().subscribe();
  }, [loader$]);

  const loadMore = useCallback(() => {
    loader$().subscribe();
  }, [loader$]);

  const messages = useObservable(useMemo(() => eventStore.timeline(filters), [filters])) ?? [];

  return (
    <div className="flex flex-col h-full p-4 overflow-hidden w-full">
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col-reverse gap-2">
        {messages.map((message) => (
          <Message key={message.id} pubkey={pubkey} message={message} storage={storage} signer={signer} />
        ))}

        <button onClick={loadMore} className="btn btn-primary mx-auto">
          Load more
        </button>
      </div>

      <DirectMessageForm corraspondant={corraspondant} relay={relay} />
    </div>
  );
}

function HomeView({ pubkey, signer, storage }: { pubkey: string; signer: ExtensionSigner; storage: SecureStorage }) {
  const [relay, setRelay] = useState<string>("wss://relay.damus.io/");
  const [selected, setSelected] = useState<string | null>(null);

  const filters = useMemo<Filter[]>(
    () => [
      { kinds: [4], authors: [pubkey] },
      { kinds: [4], "#p": [pubkey] },
    ],
    [pubkey],
  );

  // Create a loader and start it
  const timeline = useMemo(() => timelineLoader(pool.request.bind(pool), [relay], filters, { eventStore }), [relay]);
  useEffect(() => {
    // Load first page of events
    timeline().subscribe();
  }, [timeline]);

  const loadMore = useCallback(() => {
    timeline().subscribe();
  }, [timeline]);

  // Get all events from the event store
  const events = useObservable(useMemo(() => eventStore.timeline(filters), [filters])) ?? [];

  const clearCache = useCallback(() => {
    localforage.clear();
    const events = eventStore.getAll({ kinds: [4] });
    for (const event of events) lockEncryptedContent(event);
  }, [eventStore]);

  return (
    <div className="flex bg-base-200 overflow-hidden" style={{ height: "calc(100vh - 10rem)" }}>
      <div className="w-xs bg-base-100 p-2 overflow-y-auto flex flex-col gap-2 shrink-0">
        <div className="flex gap-2 w-full">
          <RelayPicker className="w-full" value={relay} onChange={setRelay} />
          <button className="btn" onClick={clearCache}>
            Clear
          </button>
        </div>
        <ContactList events={events} pubkey={pubkey} onSelect={setSelected} />
        <button onClick={loadMore} className="btn btn-primary mx-auto" onScroll={loadMore}>
          Load more
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {selected ? (
          <DirectMessageView pubkey={pubkey} corraspondant={selected} relay={relay} storage={storage} signer={signer} />
        ) : (
          <div className="flex items-center justify-center h-full text-base-content/50">
            Select a contact to start messaging
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [storage, setStorage] = useState<SecureStorage | null>(null);
  const [pubkey, setPubkey] = useState<string | null>(null);
  const signer = useObservable(signer$);

  const handleUnlock = async (storage: SecureStorage, pubkey?: string) => {
    if (pubkey) {
      setPubkey(pubkey);
      signer$.next(new ExtensionSigner());
    }
    setStorage(storage);
  };
  const handleLogin = async (signer: ExtensionSigner, pubkey: string) => {
    signer$.next(signer);
    setPubkey(pubkey);
    if (storage) await storage.setItem("pubkey", pubkey);
  };

  // Show unlock view if storage is not initialized
  if (!storage) return <UnlockView onUnlock={handleUnlock} />;

  // Show login view if not logged in
  if (!signer || !pubkey) return <LoginView onLogin={handleLogin} />;

  // Show main app view when both storage and login are ready
  return <HomeView pubkey={pubkey} signer={signer} storage={storage} />;
}

export default App;
