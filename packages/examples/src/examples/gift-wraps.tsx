import { EventStore } from "applesauce-core";
import {
  getEncryptedContent,
  getGiftWrapEvent,
  getGiftWrapSeal,
  getParentEventStore,
  isGiftWrapLocked,
  setEncryptedContentCache,
  unlockGiftWrap,
} from "applesauce-core/helpers";
import { GiftWrapModel } from "applesauce-core/models";
import { timelineLoader } from "applesauce-loaders/loaders";
import { useObservableEagerMemo, useObservableMemo, useObservableState } from "applesauce-react/hooks";
import { RelayPool } from "applesauce-relay";
import { ExtensionSigner } from "applesauce-signers";
import localforage from "localforage";
import { kinds, NostrEvent } from "nostr-tools";
import { useEffect, useMemo, useState } from "react";
import { BehaviorSubject, filter, map } from "rxjs";

import RelayPicker from "../components/relay-picker";
import SecureStorage from "../extra/encrypted-storage";

const storage = new SecureStorage(localforage);
const signer$ = new BehaviorSubject<ExtensionSigner | null>(null);
const eventStore = new EventStore();
const pool = new RelayPool();

// Restore encrypted content when loaded
eventStore.filters([{ kinds: [kinds.GiftWrap] }]).subscribe(async (gift) => {
  // Restore gift wrap encrypted content
  const content = await storage.getItem(gift.id);
  if (content) {
    setEncryptedContentCache(gift, content);

    // Try to parse the seal from the restored content
    const seal = getGiftWrapSeal(gift);
    if (seal) {
      // Restore seal encrypted content
      const content = await storage.getItem(seal.id);
      if (content) setEncryptedContentCache(seal, content);
    }

    // Notify the store the gift warp has updated
    const store = getParentEventStore(gift);
    if (store) store.update(gift);
  }
});

// Save encrypted content when gift wraps are unlocked
eventStore.update$.pipe(filter((e) => e.kind === kinds.GiftWrap)).subscribe((gift) => {
  // Save encrypted content
  const content = getEncryptedContent(gift);
  if (content) storage.setItem(gift.id, content);

  // Save seal encrypted content
  const seal = getGiftWrapSeal(gift);
  if (seal) {
    const content = getEncryptedContent(seal);
    if (content) storage.setItem(seal.id, content);
  }
});

function UnlockView({ onUnlock }: { onUnlock: (pubkey?: string) => void }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const isValid = await storage.unlock(pin);
      if (!isValid) return setError("Invalid PIN");

      const pubkey = (await storage.getItem("pubkey")) ?? undefined;
      onUnlock(pubkey);
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

function GiftWrapEvent({ event, signer }: { event: NostrEvent; signer: ExtensionSigner }) {
  const [unlocking, setUnlocking] = useState(false);
  const locked = isGiftWrapLocked(event);
  const rumor = getGiftWrapEvent(event);

  // Subscribe to event updates
  useObservableMemo(() => eventStore.updated(event.id), [event.id]);

  const handleUnlock = async () => {
    try {
      setUnlocking(true);
      await unlockGiftWrap(event, signer);
    } catch (err) {
      console.error("Failed to unlock gift wrap:", err);
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-md mb-4">
      <div className="card-body">
        {locked ? (
          <>
            <h3 className="card-title">Locked Gift Wrap</h3>

            <button className="btn btn-primary" onClick={handleUnlock} disabled={unlocking}>
              {unlocking ? "Unlocking..." : "Unlock"}
            </button>
          </>
        ) : rumor ? (
          <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto">
            <code>{JSON.stringify(rumor, null, 2)}</code>
          </pre>
        ) : null}
      </div>
    </div>
  );
}

type FilterType = "all" | "locked" | "unlocked";
function HomeView({ pubkey, signer }: { pubkey: string; signer: ExtensionSigner }) {
  const [relay, setRelay] = useState<string>("wss://relay.damus.io/");
  const [filter, setFilter] = useState<FilterType>("all");

  // Subscribe to model based on filter type
  const events = useObservableEagerMemo(() => {
    switch (filter) {
      case "locked":
        return eventStore.model(GiftWrapModel, pubkey, true).pipe(map((t) => [...t]));
      case "unlocked":
        return eventStore.model(GiftWrapModel, pubkey, false).pipe(map((t) => [...t]));
      default:
        return eventStore.model(GiftWrapModel, pubkey).pipe(map((t) => [...t]));
    }
  }, [pubkey, filter]);

  // Setup loader
  const loader$ = useMemo(
    () =>
      timelineLoader(pool.request.bind(pool), [relay], [{ kinds: [kinds.GiftWrap], "#p": [pubkey] }], { eventStore }),
    [relay, pubkey],
  );

  useEffect(() => {
    loader$().subscribe();
  }, [loader$]);

  return (
    <div className=" container mx-auto flex flex-col h-screen p-4">
      <div className="flex gap-4 mb-4">
        <RelayPicker value={relay} onChange={setRelay} />
        <select
          className="select select-bordered"
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterType)}
        >
          <option value="all">All Events</option>
          <option value="locked">Locked</option>
          <option value="unlocked">Unlocked</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {events.map((event) => (
          <GiftWrapEvent key={event.id} event={event} signer={signer} />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [locked, setLocked] = useState(!storage.unlocked);
  const [pubkey, setPubkey] = useState<string | null>(null);
  const signer = useObservableState(signer$);

  const handleUnlock = async (pubkey?: string) => {
    if (pubkey) {
      setPubkey(pubkey);
      signer$.next(new ExtensionSigner());
    }
    setLocked(false);
  };

  const handleLogin = async (signer: ExtensionSigner, pubkey: string) => {
    signer$.next(signer);
    setPubkey(pubkey);
    if (storage) await storage.setItem("pubkey", pubkey);
  };

  if (locked) return <UnlockView onUnlock={handleUnlock} />;
  if (!signer || !pubkey) return <LoginView onLogin={handleLogin} />;
  return <HomeView pubkey={pubkey} signer={signer} />;
}
