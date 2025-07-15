import { CashuMint, CashuWallet } from "@cashu/cashu-ts";
import { ActionHub } from "applesauce-actions";
import { EventStore, Model } from "applesauce-core";
import {
  getDisplayName,
  getProfilePicture,
  getSeenRelays,
  mergeRelaySets,
  ProfileContent,
} from "applesauce-core/helpers";
import { EventFactory } from "applesauce-factory";
import { createAddressLoader } from "applesauce-loaders/loaders";
import { useObservableMemo } from "applesauce-react/hooks";
import { RelayPool } from "applesauce-relay";
import { ExtensionSigner } from "applesauce-signers";
import { NutzapProfile } from "applesauce-wallet/actions";
import {
  getNutzapInfoMints,
  getNutzapInfoPubkey,
  getNutzapInfoRelays,
  NUTZAP_INFO_KIND,
} from "applesauce-wallet/helpers";
import { kinds, NostrEvent } from "nostr-tools";
import { npubEncode, ProfilePointer } from "nostr-tools/nip19";
import { useEffect, useMemo, useState } from "react";
import { EMPTY, ignoreElements, iif, lastValueFrom } from "rxjs";
import { mergeWith } from "rxjs/operators";

// Preset list of npubs that can be zapped
const PRESET_NPUBS = [
  {
    name: "hzrd149",
    pubkey: "266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5",
    relays: ["wss://nostrue.com/", "wss://relay.damus.io/"],
  },
  {
    name: "PABLOF7z",
    pubkey: "fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52",
    relays: ["wss://f7z.io/", "wss://relay.primal.net/"],
  },
  {
    name: "verbiricha",
    pubkey: "7fa56f5d6962ab1e3cd424e758c3002b8665f7b0d8dcee9fe9e288d7751ac194",
    relays: ["wss://frens.nostr1.com/", "wss://pyramid.fiatjaf.com/"],
  },
];

// Global state
const eventStore = new EventStore();
const pool = new RelayPool();
const signer = new ExtensionSigner();
const factory = new EventFactory({ signer: signer });
const actionHub = new ActionHub(eventStore, factory, async () => {});

// Create an address loader to load user profiles
const addressLoader = createAddressLoader(pool, {
  // Pass all events to the store
  eventStore,
  // Fallback to lookup relays if profiles cant be found
  lookupRelays: ["wss://purplepag.es", "wss://index.hzrd149.com"],
});

/** A model that loads the profile if its not found in the event store */
function ProfileQuery(user: ProfilePointer): Model<ProfileContent | undefined> {
  return (events) =>
    iif(
      () => events.hasReplaceable(kinds.Metadata, user.pubkey),
      addressLoader({ kind: kinds.Metadata, ...user }),
      EMPTY,
    ).pipe(ignoreElements(), mergeWith(events.profile(user.pubkey)));
}

/** Create a hook for loading a users profile */
function useProfile(user: ProfilePointer): ProfileContent | undefined {
  return useObservableMemo(() => eventStore.model(ProfileQuery, user), [user.pubkey, user.relays?.join("|")]);
}

// Profile card component
function ProfileCard({ nutzapInfo, onZap }: { nutzapInfo: NostrEvent; onZap: () => void }) {
  const mints = getNutzapInfoMints(nutzapInfo);
  const relays = getNutzapInfoRelays(nutzapInfo);
  const nutzapPubkey = getNutzapInfoPubkey(nutzapInfo);

  // Load the actual profile data
  const profile = useProfile(
    useMemo(() => ({ pubkey: nutzapInfo.pubkey, relays: mergeRelaySets(getSeenRelays(nutzapInfo)) }), [nutzapInfo]),
  );

  const displayName = getDisplayName(profile) || npubEncode(nutzapInfo.pubkey);
  const picture = getProfilePicture(profile, `https://robohash.org/${nutzapInfo.pubkey}.png`);

  return (
    <div className="card bg-base-100 shadow-xl max-w-lg mx-auto">
      <div className="card-body">
        <div className="flex items-center gap-4 mb-4">
          <div className="avatar">
            <div className="w-16 rounded-full">
              <img src={picture} alt={displayName} />
            </div>
          </div>
          <div>
            <h2 className="card-title">{displayName}</h2>
            <p className="text-sm opacity-70">{npubEncode(nutzapInfo.pubkey)}</p>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-2">Nutzap Pubkey:</h3>
          <div className="text-sm bg-base-200 rounded px-2 py-1 font-mono">
            {nutzapPubkey ? nutzapPubkey : "Not specified"}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-2">Supported Mints:</h3>
          <div className="space-y-1">
            {mints.map((mint, i) => (
              <div key={i} className="text-sm bg-base-200 rounded px-2 py-1">
                {mint.mint}
                {mint.units && mint.units.length > 0 && (
                  <span className="ml-2 text-xs opacity-70">({mint.units.join(", ")})</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-2">Relays:</h3>
          <div className="space-y-1">
            {relays.map((relay, i) => (
              <div key={i} className="text-sm bg-base-200 rounded px-2 py-1">
                {relay}
              </div>
            ))}
          </div>
        </div>

        <div className="card-actions justify-end">
          <button className="btn btn-primary btn-lg" onClick={onZap} disabled={!nutzapPubkey || mints.length === 0}>
            ⚡ Zap Profile
          </button>
        </div>
      </div>
    </div>
  );
}

// QR Code component for lightning invoice
function QRCode({ value }: { value: string }) {
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="bg-white p-4 rounded-lg">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}`}
          alt="QR Code"
          className="w-48 h-48"
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-mono break-all bg-base-200 p-2 rounded">{value}</p>
      </div>
    </div>
  );
}

// Zap modal component
function ZapModal({
  nutzapInfo,
  onClose,
  onZapSent,
}: {
  nutzapInfo: NostrEvent;
  onClose: () => void;
  onZapSent: () => void;
}) {
  const [amount, setAmount] = useState(21);
  const [comment, setComment] = useState("");
  const [invoice, setInvoice] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<"input" | "invoice" | "paid">("input");

  const mints = getNutzapInfoMints(nutzapInfo);
  const firstMint = mints[0]?.mint;
  const rawNutzapPubkey = getNutzapInfoPubkey(nutzapInfo);
  const nutzapRelays = getNutzapInfoRelays(nutzapInfo);

  // Ensure pubkey is properly prefixed with "02" for NIP-61 compliance
  const nutzapPubkey = rawNutzapPubkey
    ? rawNutzapPubkey.startsWith("02")
      ? rawNutzapPubkey
      : `02${rawNutzapPubkey}`
    : null;

  const handleZap = async () => {
    if (!firstMint || !nutzapPubkey) {
      alert("Profile doesn't have proper nutzap info");
      return;
    }

    setIsProcessing(true);
    try {
      // Create mint and wallet
      const mint = new CashuMint(firstMint);
      const wallet = new CashuWallet(mint);

      // Request a quote for minting
      const quote = await wallet.createMintQuote(amount);
      setInvoice(quote.request);
      setStatus("invoice");

      // Start checking payment status
      const checkPayment = async () => {
        try {
          const quoteStatus = await wallet.checkMintQuote(quote.quote);
          if (quoteStatus.state === "PAID") {
            // Mint proofs with P2PK lock
            const result = await wallet.mintProofs(amount, quote.quote, {
              pubkey: nutzapPubkey,
            });

            // Create token from proofs
            const tokens = { mint: firstMint, proofs: result.proofs, unit: "sat" };

            // Create nutzap event
            await actionHub.exec(NutzapProfile, nutzapInfo.pubkey, tokens, comment).forEach(async (event) => {
              // Publish to nutzap relays
              try {
                await lastValueFrom(pool.publish(nutzapRelays, event));
              } catch (error) {
                console.error("Failed to publish", error);
              }
            });

            setStatus("paid");
            onZapSent();
          }
        } catch (error) {
          console.error("Payment check failed:", error);
        }
      };

      // Poll for payment every 2 seconds
      const pollInterval = setInterval(checkPayment, 2000);

      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000);
    } catch (error) {
      console.error("Zap failed:", error);
      alert("Failed to create zap: " + error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualCheck = async () => {
    if (!firstMint || !invoice) return;

    setIsProcessing(true);
    try {
      const mint = new CashuMint(firstMint);
      const wallet = new CashuWallet(mint);

      // Get quote ID from invoice (simplified)
      const quoteId = invoice.split("=")[1] || invoice;

      const quoteStatus = await wallet.checkMintQuote(quoteId);
      if (quoteStatus.state === "PAID") {
        const result = await wallet.mintProofs(amount, quoteId, {
          pubkey: nutzapPubkey!,
        });

        const tokens = { mint: firstMint, proofs: result.proofs, unit: "sat" };

        await actionHub.exec(NutzapProfile, nutzapInfo.pubkey, tokens, comment).forEach(async (event) => {
          for (const relay of nutzapRelays) {
            try {
              await pool.relay(relay).publish(event);
            } catch (error) {
              console.error("Failed to publish to relay:", relay, error);
            }
          }
        });

        setStatus("paid");
        onZapSent();
      } else {
        alert("Payment not confirmed yet");
      }
    } catch (error) {
      console.error("Manual check failed:", error);
      alert("Failed to check payment: " + error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Zap Profile</h2>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            ✕
          </button>
        </div>

        {status === "input" && (
          <div className="space-y-4">
            <div>
              <label className="label">Amount (sats)</label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min="1"
              />
            </div>

            <div>
              <label className="label">Comment (optional)</label>
              <textarea
                className="textarea textarea-bordered w-full"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Say something nice..."
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button onClick={onClose} className="btn btn-ghost">
                Cancel
              </button>
              <button onClick={handleZap} className="btn btn-primary" disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Create Zap"}
              </button>
            </div>
          </div>
        )}

        {status === "invoice" && invoice && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Pay Invoice</h3>
              <p className="text-sm opacity-70 mb-4">Scan the QR code or copy the invoice to pay {amount} sats</p>
            </div>

            <QRCode value={invoice} />

            <div className="flex justify-center space-x-2">
              <button onClick={handleManualCheck} className="btn btn-primary" disabled={isProcessing}>
                {isProcessing ? "Checking..." : "Check Payment"}
              </button>
              <button onClick={onClose} className="btn btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        )}

        {status === "paid" && (
          <div className="text-center space-y-4">
            <div className="text-green-500 text-4xl">✅</div>
            <h3 className="text-lg font-semibold">Zap Sent!</h3>
            <p className="text-sm opacity-70">Your nutzap has been successfully sent to the profile</p>
            <button onClick={onClose} className="btn btn-primary">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ZapProfile() {
  const [selected, setSelected] = useState<string>("");
  const [selectedProfile, setSelectedProfile] = useState<NostrEvent | null>(null);
  const [showZapModal, setShowZapModal] = useState(false);

  // Load nutzap info for selected npub using address loader
  const nutzapInfo = useObservableMemo(() => {
    if (!selected) return undefined;

    return addressLoader({
      kind: NUTZAP_INFO_KIND,
      pubkey: selected,
      relays: PRESET_NPUBS.find((p) => p.pubkey === selected)?.relays,
    });
  }, [selected]);

  // Update selected profile when nutzap info changes
  useEffect(() => {
    if (nutzapInfo) {
      setSelectedProfile(nutzapInfo);
    } else {
      setSelectedProfile(null);
    }
  }, [nutzapInfo]);

  const handleZapSent = () => {
    setShowZapModal(false);
    alert("Nutzap sent successfully!");
  };

  return (
    <div className="container mx-auto my-8 p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Nutzap Profile</h1>
      </div>

      <div className="text-center mb-6">
        <p className="text-lg mb-4">Select a profile to zap with nutzaps!</p>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Choose a profile:</label>
          <select
            className="select select-bordered w-full max-w-xs"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select a profile...</option>
            {PRESET_NPUBS.map((profile) => (
              <option key={profile.pubkey} value={profile.pubkey}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selected && !selectedProfile && (
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">Loading nutzap info...</p>
        </div>
      )}

      {selectedProfile ? (
        <ProfileCard nutzapInfo={selectedProfile} onZap={() => setShowZapModal(true)} />
      ) : selected ? (
        <div className="text-center">
          <div className="alert alert-warning max-w-md mx-auto">
            <span>No nutzap info found for this profile</span>
          </div>
        </div>
      ) : null}

      {showZapModal && selectedProfile && (
        <ZapModal nutzapInfo={selectedProfile} onClose={() => setShowZapModal(false)} onZapSent={handleZapSent} />
      )}
    </div>
  );
}
