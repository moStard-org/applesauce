import { beforeEach, describe, expect, it, vi } from "vitest";

import { NostrConnectSigner } from "../nostr-connect-signer.js";
import { SimpleSigner } from "../simple-signer.js";

const relays = ["wss://relay.signer.com"];
const client = new SimpleSigner();
const remote = new SimpleSigner();
const subscription = vi.fn().mockReturnValue({ subscribe: vi.fn() });
const publish = vi.fn(async () => {});

beforeEach(() => {
  subscription.mockClear();
  publish.mockClear();
});

describe("connection", () => {
  it("should call subscription method with filters", async () => {
    const signer = new NostrConnectSigner({
      relays,
      remote: await remote.getPublicKey(),
      signer: client,
      subscriptionMethod: subscription,
      publishMethod: publish,
    });

    signer.connect();

    expect(subscription).toHaveBeenCalledWith(relays, [{ "#p": [await client.getPublicKey()], kinds: [24133] }]);
  });
});

describe("open", () => {
  it("should call subscription method with filters", async () => {
    const signer = new NostrConnectSigner({
      relays,
      remote: await remote.getPublicKey(),
      signer: client,
      subscriptionMethod: subscription,
      publishMethod: publish,
    });

    signer.open();

    expect(subscription).toHaveBeenCalledWith(relays, [{ "#p": [await client.getPublicKey()], kinds: [24133] }]);
  });
});

describe("waitForSigner", () => {
  it("should accept an abort signal", async () => {
    const signer = new NostrConnectSigner({
      relays: ["wss://relay.signer.com"],
      remote: await remote.getPublicKey(),
      signer: client,
      subscriptionMethod: subscription,
      publishMethod: publish,
    });

    const controller = new AbortController();
    const p = signer.waitForSigner(controller.signal);

    setTimeout(() => {
      controller.abort();
    }, 10);

    await expect(p).rejects.toThrow("Aborted");
    expect(signer.listening).toBe(false);
  });
});
