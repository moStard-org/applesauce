import { beforeEach, describe, expect, it, vi } from "vitest";

import { NostrConnectSigner } from "../nostr-connect-signer.js";
import { SimpleSigner } from "../simple-signer.js";

const relays = ["wss://relay.signer.com"];
const client = new SimpleSigner();
const remote = new SimpleSigner();

const observable = { unsubscribe: vi.fn() };
const req = { subscribe: vi.fn().mockReturnValue(observable) };

const subscriptionMethod = vi.fn().mockReturnValue(req);
const publishMethod = vi.fn(async () => {});

let signer: NostrConnectSigner;

beforeEach(async () => {
  observable.unsubscribe.mockClear();
  req.subscribe.mockClear();
  subscriptionMethod.mockClear();
  publishMethod.mockClear();

  signer = new NostrConnectSigner({
    relays,
    remote: await remote.getPublicKey(),
    signer: client,
    subscriptionMethod,
    publishMethod,
  });
});

describe("connection", () => {
  it("should call subscription method with filters", async () => {
    signer.connect();

    expect(subscriptionMethod).toHaveBeenCalledWith(relays, [{ "#p": [await client.getPublicKey()], kinds: [24133] }]);
  });
});

describe("open", () => {
  it("should call subscription method with filters", async () => {
    signer.open();

    expect(subscriptionMethod).toHaveBeenCalledWith(relays, [{ "#p": [await client.getPublicKey()], kinds: [24133] }]);
  });
});

describe("waitForSigner", () => {
  it("should accept an abort signal", async () => {
    const signer = new NostrConnectSigner({
      relays: ["wss://relay.signer.com"],
      signer: client,
      subscriptionMethod,
      publishMethod,
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

describe("close", () => {
  it("should close the connection", async () => {
    await signer.open();
    expect(req.subscribe).toHaveBeenCalled();

    await signer.close();
    expect(observable.unsubscribe).toHaveBeenCalled();
  });

  it("it should cancel waiting for signer promie", async () => {
    const p = signer.waitForSigner();
    await signer.close();
    await expect(p).rejects.toThrow("Closed");
  });
});
