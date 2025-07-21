import { EventFactory } from "applesauce-factory";
import { RelayPool } from "applesauce-relay";
import { NostrConnectSigner } from "applesauce-signers";
import { useState } from "react";
import JsonBlock from "../../components/json-block";

// Create a relay pool to make relay connections
const pool = new RelayPool();

// Setup nostr connect signer
NostrConnectSigner.subscriptionMethod = pool.subscription.bind(pool);
NostrConnectSigner.publishMethod = pool.publish.bind(pool);

// Simple QR code component - in a real app you might want to use qrcode.react or similar
const QRCode = ({ data }: { data: string }) => (
  <div className="flex items-center justify-center p-4 bg-white rounded-lg">
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`}
      alt="QR Code"
      className="w-48 h-48"
    />
  </div>
);

const BunkerUrlLogin = ({ onSignerCreated }: { onSignerCreated: (signer: NostrConnectSigner) => void }) => {
  const [bunkerUrl, setBunkerUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!bunkerUrl) return;

    try {
      setIsConnecting(true);
      setError(null);

      // Create signer from bunker URL
      const newSigner = await NostrConnectSigner.fromBunkerURI(bunkerUrl);

      onSignerCreated(newSigner);
    } catch (err) {
      console.error("Connection error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="card bg-base-200 shadow-md mb-6">
      <div className="card-body">
        <h2 className="card-title mb-4">Login with Bunker URL</h2>
        <div className="form-control mb-4">
          <input
            type="text"
            placeholder="Enter bunker:// URL"
            className="input input-bordered w-full"
            value={bunkerUrl}
            onChange={(e) => setBunkerUrl(e.target.value)}
          />
        </div>
        <button className={`btn btn-primary w-full`} onClick={handleConnect} disabled={!bunkerUrl || isConnecting}>
          {isConnecting ? "Connecting..." : "Connect"}
        </button>

        {error && (
          <div className="alert alert-error mt-4">
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const QRCodeLogin = ({ onSignerCreated }: { onSignerCreated: (signer: NostrConnectSigner) => void }) => {
  const [nostrConnectUri, setNostrConnectUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleQrCodeLogin = async () => {
    try {
      setError(null);
      setIsConnecting(true);

      // Create a new signer for QR code login
      const newSigner = new NostrConnectSigner({
        relays: ["wss://relay.nsec.app"],
      });

      // Generate QR code URI with metadata
      const uri = newSigner.getNostrConnectURI({
        name: "Applesauce Example",
      });

      setNostrConnectUri(uri);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout

      try {
        // Wait for signer to connect
        await newSigner.waitForSigner(controller.signal);
        clearTimeout(timeoutId);

        onSignerCreated(newSigner);
        setNostrConnectUri(null);
      } catch (err) {
        console.error("Wait for signer error:", err);
        if (err instanceof Error && err.message === "Aborted") {
          setError("Connection timeout. Please try again.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to connect");
        }
        setNostrConnectUri(null);
      }
    } catch (err) {
      console.error("QR code login error:", err);
      setError(err instanceof Error ? err.message : "QR code login failed");
      setNostrConnectUri(null);
    } finally {
      setIsConnecting(false);
    }
  };

  if (nostrConnectUri) {
    return (
      <div className="card bg-base-200 shadow-md">
        <div className="card-body items-center text-center">
          <p className="mb-4">Scan this QR code with your Nostr mobile signer</p>
          <a target="_parent" href={nostrConnectUri}>
            <QRCode data={nostrConnectUri} />
          </a>
          <button className="btn btn-outline mt-4" onClick={() => setNostrConnectUri(null)}>
            Cancel
          </button>

          {error && (
            <div className="alert alert-error mt-4">
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 shadow-md">
      <div className="card-body">
        <h2 className="card-title mb-4">Login with QR Code</h2>
        <button className="btn btn-accent w-full" onClick={handleQrCodeLogin} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Login with QR Code"}
        </button>

        {error && (
          <div className="alert alert-error mt-4">
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const AccountCard = ({ signer, onDisconnect }: { signer: NostrConnectSigner; onDisconnect: () => void }) => {
  const [error, setError] = useState<string | null>(null);
  const [userPubkey, setUserPubkey] = useState<string | null>(null);
  const [isLoadingPubkey, setIsLoadingPubkey] = useState(false);

  // State for the text note component
  const [noteText, setNoteText] = useState<string>("");
  const [signedEvent, setSignedEvent] = useState<any>(null);
  const [isSigningNote, setIsSigningNote] = useState(false);

  const handleGetPubkey = async () => {
    try {
      setIsLoadingPubkey(true);
      setError(null);
      const pubkey = await signer.getPublicKey();
      setUserPubkey(pubkey);
    } catch (err) {
      console.error("Failed to get pubkey:", err);
      setError(err instanceof Error ? err.message : "Failed to get pubkey");
    } finally {
      setIsLoadingPubkey(false);
    }
  };

  const handleSignNote = async () => {
    if (!noteText.trim()) return;

    try {
      setIsSigningNote(true);
      setError(null);

      // Create event factory with the signer
      const factory = new EventFactory({ signer });

      // Create and sign a simple text note
      const noteTemplate = await factory.note(noteText);
      const signedNote = await factory.sign(noteTemplate);

      // Set the signed event to display
      setSignedEvent(signedNote);
    } catch (err) {
      console.error("Failed to sign note:", err);
      setError(err instanceof Error ? err.message : "Failed to sign note");
    } finally {
      setIsSigningNote(false);
    }
  };

  const handleDisconnect = () => {
    signer.close();
    onDisconnect();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-center">Account Information</h1>

      <div className="card bg-base-200 shadow-md mb-6">
        <div className="card-body">
          <h2 className="card-title mb-4">Public Key</h2>
          <div className="form-control mb-4">
            <input
              type="text"
              className="input input-bordered w-full font-mono text-sm"
              value={userPubkey || ""}
              readOnly
            />
          </div>
          <button className="btn btn-primary w-full" onClick={handleGetPubkey} disabled={isLoadingPubkey}>
            {isLoadingPubkey ? "Loading..." : "Fetch Public Key"}
          </button>
        </div>
      </div>

      <div className="card bg-base-200 shadow-md mb-6">
        <div className="card-body">
          <h2 className="card-title mb-4">Create and Sign a Note</h2>
          <div className="form-control mb-4">
            <textarea
              className="textarea textarea-bordered w-full h-32"
              placeholder="Type your note here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary w-full"
            onClick={handleSignNote}
            disabled={!noteText.trim() || isSigningNote}
          >
            {isSigningNote ? "Signing..." : "Sign Note"}
          </button>

          {signedEvent && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Signed Event:</h3>
              <JsonBlock value={signedEvent} />
            </div>
          )}
        </div>
      </div>

      <button className="btn btn-outline w-full" onClick={handleDisconnect}>
        Disconnect
      </button>

      {error && (
        <div className="alert alert-error mt-4">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default function BunkerLogin() {
  const [signer, setSigner] = useState<NostrConnectSigner | null>(null);

  // Handle signer creation
  const handleSignerCreated = (newSigner: NostrConnectSigner) => {
    setSigner(newSigner);
  };

  // Handle disconnect
  const handleDisconnect = () => {
    signer?.close();
    setSigner(null);
  };

  if (!signer) {
    return (
      <div className="container mx-auto my-8 px-4 py-8 max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Bunker Login</h1>

        <BunkerUrlLogin onSignerCreated={handleSignerCreated} />
        <QRCodeLogin onSignerCreated={handleSignerCreated} />
      </div>
    );
  }

  return (
    <div className="container mx-auto my-8 px-4 py-8 max-w-md">
      <AccountCard signer={signer} onDisconnect={handleDisconnect} />
    </div>
  );
}
