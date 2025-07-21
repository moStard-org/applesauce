import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { subscribeSpyTo } from "@hirez_io/observer-spy";
import { getSeenRelays } from "applesauce-core/helpers";
import { Filter, NostrEvent } from "nostr-tools";
import { WS } from "vitest-websocket-mock";

import { Relay } from "../relay.js";
import { filter } from "rxjs/operators";
import { firstValueFrom, of, Subject, throwError, timer } from "rxjs";
import { RelayInformation } from "nostr-tools/nip11";

const defaultMockInfo: RelayInformation = {
  name: "Test Relay",
  description: "Test Relay Description",
  pubkey: "testpubkey",
  contact: "test@example.com",
  supported_nips: [1, 2, 3],
  software: "test-software",
  version: "1.0.0",
};
let server: WS;
let relay: Relay;

beforeEach(async () => {
  // Mock empty information document
  vi.spyOn(Relay, "fetchInformationDocument").mockImplementation(() => of(null));

  // Create mock relay
  server = new WS("wss://test", { jsonProtocol: true });

  // Create relay
  relay = new Relay("wss://test");
  relay.keepAlive = 0;
});

// Wait for server to close to prevent memory leaks
afterEach(async () => {
  await WS.clean();
  vi.clearAllTimers();
  vi.useRealTimers();
});

const mockEvent: NostrEvent = {
  kind: 1,
  id: "00007641c9c3e65a71843933a44a18060c7c267a4f9169efa3735ece45c8f621",
  pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  created_at: 1743712795,
  tags: [["nonce", "13835058055282167643", "16"]],
  content: "This is just stupid: https://codestr.fiatjaf.com/",
  sig: "5a57b5a12bba4b7cf0121077b1421cf4df402c5c221376c076204fc4f7519e28ce6508f26ddc132c406ccfe6e62cc6db857b96c788565cdca9674fe9a0710ac2",
};

describe("req", () => {
  it("should trigger connection to relay", async () => {
    subscribeSpyTo(relay.req([{ kinds: [1] }], "sub1"));

    // Wait for connection
    await firstValueFrom(relay.connected$.pipe(filter(Boolean)));

    expect(relay.connected).toBe(true);
  });

  it("should send expected messages to relay", async () => {
    subscribeSpyTo(relay.req([{ kinds: [1] }], "sub1"));

    await expect(server).toReceiveMessage(["REQ", "sub1", { kinds: [1] }]);
  });

  it("should not close the REQ when EOSE is received", async () => {
    // Create subscription that completes after first EOSE
    const sub = subscribeSpyTo(relay.req([{ kinds: [1] }], "sub1"));

    // Verify REQ was sent
    await expect(server).toReceiveMessage(["REQ", "sub1", { kinds: [1] }]);

    // Send EOSE to complete subscription
    server.send(["EVENT", "sub1", mockEvent]);
    server.send(["EOSE", "sub1"]);

    // Verify the subscription did not complete
    expect(sub.receivedComplete()).toBe(false);

    expect(sub.getValues()).toEqual([expect.objectContaining(mockEvent), "EOSE"]);
  });

  it("should send CLOSE when unsubscribed", async () => {
    // Create subscription that completes after first EOSE
    const sub = subscribeSpyTo(relay.req([{ kinds: [1] }], "sub1"));

    // Verify REQ was sent
    await expect(server).toReceiveMessage(["REQ", "sub1", { kinds: [1] }]);

    // Complete the subscription
    sub.unsubscribe();

    // Verify CLOSE was sent
    await expect(server).toReceiveMessage(["CLOSE", "sub1"]);
  });

  it("should emit nostr event and EOSE", async () => {
    const spy = subscribeSpyTo(relay.req([{ kinds: [1] }], "sub1"));
    await server.connected;

    // Send EVENT message
    server.send(["EVENT", "sub1", mockEvent]);

    // Send EOSE message
    server.send(["EOSE", "sub1"]);

    expect(spy.getValues()).toEqual([expect.objectContaining(mockEvent), "EOSE"]);
  });

  it("should ignore EVENT and EOSE messages that do not match subscription id", async () => {
    const spy = subscribeSpyTo(relay.req([{ kinds: [1] }], "sub1"));
    await server.connected;

    // Send EVENT message with wrong subscription id
    server.send(["EVENT", "wrong_sub", mockEvent]);

    // Send EOSE message with wrong subscription id
    server.send(["EOSE", "wrong_sub"]);

    // Send EVENT message with correct subscription id
    server.send(["EVENT", "sub1", mockEvent]);

    // Send EOSE message with correct subscription id
    server.send(["EOSE", "sub1"]);

    expect(spy.getValues()).toEqual([expect.objectContaining(mockEvent), "EOSE"]);
  });

  it("should mark events with their source relay", async () => {
    const spy = subscribeSpyTo(relay.req([{ kinds: [1] }], "sub1"));
    await server.connected;

    // Send EVENT message
    server.send(["EVENT", "sub1", mockEvent]);

    // Get the received event
    const receivedEvent = spy.getValues()[0];

    // Verify the event was marked as seen from this relay
    expect(getSeenRelays(receivedEvent)).toContain("wss://test");
  });

  it("should error subscription when CLOSED message is received", async () => {
    const spy = subscribeSpyTo(relay.req([{ kinds: [1] }], "sub1"), { expectErrors: true });
    await server.connected;

    // Send CLOSED message for the subscription
    server.send(["CLOSED", "sub1", "reason"]);

    // Verify the subscription completed
    expect(spy.receivedError()).toBe(true);
  });

  it("should not send multiple REQ messages for multiple subscriptions", async () => {
    const sub = relay.req([{ kinds: [1] }], "sub1");
    sub.subscribe();
    sub.subscribe();

    // Wait for all messages to be sent
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(server.messages).toEqual([["REQ", "sub1", { kinds: [1] }]]);
  });

  it("should wait for authentication if relay responds with auth-required", async () => {
    // First subscription to trigger auth-required
    const firstSub = subscribeSpyTo(relay.req([{ kinds: [1] }], "sub1"), { expectErrors: true });
    await server.nextMessage;

    // Send CLOSED message with auth-required reason
    server.send(["CLOSED", "sub1", "auth-required: need to authenticate"]);

    // wait for complete
    await firstSub.onError();
    await server.nextMessage;

    // Create a second subscription that should wait for auth
    const secondSub = subscribeSpyTo(relay.req([{ kinds: [1] }], "sub2"), { expectErrors: true });

    // Verify no REQ message was sent yet (waiting for auth)
    expect(server).not.toHaveReceivedMessages(["REQ", "sub2", { kinds: [1] }]);

    // Simulate successful authentication
    relay.authenticationResponse$.next({ ok: true });

    // Now the REQ should be sent
    await expect(server).toReceiveMessage(["REQ", "sub2", { kinds: [1] }]);

    // Send EVENT and EOSE to complete the subscription
    server.send(["EVENT", "sub2", mockEvent]);
    server.send(["EOSE", "sub2"]);

    // Verify the second subscription received the event and EOSE
    expect(secondSub.getValues()).toEqual([expect.objectContaining(mockEvent), "EOSE"]);
  });

  // Skipped test because it no longer waits for NIP-11 information document
  // it("should open connection and wait for authentication if relay info document has limitations.auth_required = true", async () => {
  //   // Mock the fetchInformationDocument method to return a document with auth_required = true
  //   vi.spyOn(Relay, "fetchInformationDocument").mockImplementation(() =>
  //     of({
  //       name: "Auth Required Relay",
  //       description: "A relay that requires authentication",
  //       pubkey: "",
  //       contact: "",
  //       supported_nips: [1, 2, 4],
  //       software: "",
  //       version: "",
  //       limitation: {
  //         auth_required: true,
  //       },
  //     } satisfies RelayInformation),
  //   );

  //   // Create a subscription that should wait for auth
  //   const sub = subscribeSpyTo(relay.req([{ kinds: [1] }], "sub1"));

  //   // Wait 10ms to ensure the information document is fetched
  //   await new Promise((resolve) => setTimeout(resolve, 10));

  //   // Wait for connection
  //   await server.connected;

  //   // Verify no REQ message was sent yet (waiting for auth)
  //   expect(server).not.toHaveReceivedMessages(["REQ", "sub1", { kinds: [1] }]);

  //   // Send AUTH challenge
  //   server.send(["AUTH", "challenge"]);

  //   // Send auth response
  //   subscribeSpyTo(relay.auth(mockEvent));

  //   // Verify the auth event was sent
  //   await expect(server.nextMessage).resolves.toEqual(["AUTH", mockEvent]);

  //   // Accept auth
  //   server.send(["OK", mockEvent.id, true, ""]);

  //   // Simulate successful authentication
  //   expect(relay.authenticated).toBe(true);

  //   // Now the REQ should be sent
  //   await expect(server).toReceiveMessage(["REQ", "sub1", { kinds: [1] }]);

  //   // Send EVENT and EOSE to complete the subscription
  //   server.send(["EVENT", "sub1", mockEvent]);
  //   server.send(["EOSE", "sub1"]);

  //   // Verify the subscription received the event and EOSE
  //   expect(sub.getValues()).toEqual([expect.objectContaining(mockEvent), "EOSE"]);
  // });

  it("should throw error if relay closes connection with error", async () => {
    const spy = subscribeSpyTo(relay.req([{ kinds: [1] }], "sub1"), { expectErrors: true });
    await server.connected;

    // Send CLOSE message with error
    server.error({
      reason: "error message",
      code: 1000,
      wasClean: false,
    });

    // Verify the subscription completed with an error
    expect(spy.receivedError()).toBe(true);
  });

  it("should not return EOSE while waiting for the relay to be ready", async () => {
    vi.useFakeTimers();

    // @ts-expect-error
    relay.ready$.next(false);

    const spy = subscribeSpyTo(relay.req([{ kinds: [1] }], "sub1"), { expectErrors: true });

    // Fast-forward time by 20 seconds
    await vi.advanceTimersByTimeAsync(20000);

    expect(spy.receivedComplete()).toBe(false);
    expect(spy.receivedError()).toBe(false);
    expect(spy.receivedNext()).toBe(false);
  });

  it("should wait when relay isn't ready", async () => {
    // @ts-expect-error
    relay.ready$.next(false);

    subscribeSpyTo(relay.req([{ kinds: [1] }], "sub1"));

    // Wait 10ms to ensure the relay didn't receive anything
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(server.messages.length).toBe(0);

    // @ts-expect-error
    relay.ready$.next(true);

    await expect(server).toReceiveMessage(["REQ", "sub1", { kinds: [1] }]);
  });

  it("should wait for filters if filters are provided as an observable", async () => {
    const filters = new Subject<Filter | Filter[]>();
    subscribeSpyTo(relay.req(filters, "sub1"));

    // Wait 10sm and ensure no messages were sent yet
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(server.messagesToConsume.pendingItems.length).toBe(0);

    // Send REQ message with filters
    filters.next([{ kinds: [1] }]);

    // Wait for the REQ message to be sent
    await expect(server).toReceiveMessage(["REQ", "sub1", { kinds: [1] }]);
  });

  it("should update filters if filters are provided as an observable", async () => {
    const filters = new Subject<Filter | Filter[]>();
    subscribeSpyTo(relay.req(filters, "sub1"));

    // Send REQ message with filters
    filters.next([{ kinds: [1] }]);

    // Should send REQ message with new filters
    await expect(server).toReceiveMessage(["REQ", "sub1", { kinds: [1] }]);

    // Send REQ message with filters
    filters.next([{ kinds: [2] }]);

    // Should send new REQ message with new filters
    await expect(server).toReceiveMessage(["REQ", "sub1", { kinds: [2] }]);
    // It should not send CLOSE message
    await expect(server.messages).not.toContain(["CLOSE", "sub1"]);
  });

  it("should complete if filters are provided as an observable that completes", async () => {
    const filters = new Subject<Filter | Filter[]>();
    const sub = subscribeSpyTo(relay.req(filters, "sub1"));

    // Send REQ message with filters
    filters.next([{ kinds: [1] }]);

    // Complete the observable
    filters.complete();

    await sub.onComplete();

    expect(sub.receivedComplete()).toBe(true);
  });
});

describe("event", () => {
  it("should wait for authentication if relay responds with auth-required", async () => {
    // First event to trigger auth-required
    const firstSpy = subscribeSpyTo(relay.event(mockEvent));
    await expect(server).toReceiveMessage(["EVENT", mockEvent]);

    // Send OK with auth-required message
    server.send(["OK", mockEvent.id, false, "auth-required: need to authenticate"]);
    await firstSpy.onComplete();

    // Create a second event that should wait for auth
    const secondSpy = subscribeSpyTo(relay.event(mockEvent));

    // Verify no EVENT message was sent yet (waiting for auth)
    expect(server).not.toHaveReceivedMessages(["EVENT", mockEvent]);

    // Simulate successful authentication
    relay.authenticationResponse$.next({ ok: true });

    // Now the EVENT should be sent
    await expect(server).toReceiveMessage(["EVENT", mockEvent]);

    // Send OK response to complete the event
    server.send(["OK", mockEvent.id, true, ""]);

    // Verify the second event completed successfully
    await secondSpy.onComplete();
    expect(secondSpy.receivedComplete()).toBe(true);
  });

  // Skipped test because it no longer waits for NIP-11 information document
  // it("should wait for authentication if relay info document has limitations.auth_required = true", async () => {
  //   // Mock the fetchInformationDocument method to return a document with auth_required = true
  //   vi.spyOn(Relay, "fetchInformationDocument").mockImplementation(() =>
  //     of({
  //       name: "Auth Required Relay",
  //       description: "A relay that requires authentication",
  //       pubkey: "",
  //       contact: "",
  //       supported_nips: [1, 2, 4],
  //       software: "",
  //       version: "",
  //       limitation: {
  //         auth_required: true,
  //       },
  //     } satisfies RelayInformation),
  //   );

  //   // Create a subscription that should wait for auth
  //   const sub = subscribeSpyTo(relay.event(mockEvent));

  //   // Wait 10ms to ensure the information document is fetched
  //   await new Promise((resolve) => setTimeout(resolve, 10));

  //   // Verify no REQ message was sent yet (waiting for auth)
  //   expect(server).not.toHaveReceivedMessages(["EVENT", mockEvent]);

  //   // Simulate successful authentication
  //   relay.authenticated$.next(true);

  //   // Now the REQ should be sent
  //   await expect(server).toReceiveMessage(["EVENT", mockEvent]);

  //   // Send EVENT and EOSE to complete the subscription
  //   server.send(["OK", mockEvent.id, true, ""]);

  //   // Verify the subscription completed
  //   await sub.onComplete();
  //   expect(sub.receivedComplete()).toBe(true);
  // });

  it("should trigger connection to relay", async () => {
    subscribeSpyTo(relay.event(mockEvent));

    // Wait for connection
    await firstValueFrom(relay.connected$.pipe(filter(Boolean)));

    expect(relay.connected).toBe(true);
  });

  it("observable should complete when matching OK response received", async () => {
    const spy = subscribeSpyTo(relay.event(mockEvent));

    // Verify EVENT message was sent
    expect(await server.nextMessage).toEqual(["EVENT", mockEvent]);

    // Send matching OK response
    server.send(["OK", mockEvent.id, true, ""]);

    await spy.onComplete();

    expect(spy.receivedComplete()).toBe(true);
  });

  it("should ignore OK responses for different events", async () => {
    const spy = subscribeSpyTo(relay.event(mockEvent));
    await server.connected;

    // Send non-matching OK response
    server.send(["OK", "different_id", true, ""]);

    expect(spy.receivedComplete()).toBe(false);

    // Send matching OK response
    server.send(["OK", mockEvent.id, true, ""]);

    expect(spy.receivedComplete()).toBe(true);
  });

  it("should send EVENT message to relay", async () => {
    relay.event(mockEvent).subscribe();

    expect(await server.nextMessage).toEqual(["EVENT", mockEvent]);
  });

  it("should complete with error if no OK received within 10s", async () => {
    vi.useFakeTimers();

    const spy = subscribeSpyTo(relay.event(mockEvent));

    // Fast-forward time by 10 seconds
    await vi.advanceTimersByTimeAsync(10000);

    expect(spy.receivedComplete()).toBe(true);
    expect(spy.getLastValue()).toEqual({ ok: false, from: "wss://test", message: "Timeout" });
  });

  it("should throw error if relay closes connection with error", async () => {
    const spy = subscribeSpyTo(relay.event(mockEvent), { expectErrors: true });
    await server.connected;

    // Send CLOSE message with error
    server.error({
      reason: "error message",
      code: 1000,
      wasClean: false,
    });

    // Verify the subscription completed with an error
    expect(spy.receivedError()).toBe(true);
  });

  it("should not throw a timeout error while waiting for the relay to be ready", async () => {
    vi.useFakeTimers();

    // @ts-expect-error
    relay.ready$.next(false);

    const spy = subscribeSpyTo(relay.event(mockEvent), { expectErrors: true });

    // Fast-forward time by 20 seconds
    await vi.advanceTimersByTimeAsync(20000);

    expect(spy.receivedComplete()).toBe(false);
    expect(spy.receivedError()).toBe(false);
  });

  it("should wait when relay isn't ready", async () => {
    // @ts-expect-error
    relay.ready$.next(false);

    subscribeSpyTo(relay.event(mockEvent));

    // Wait 10ms to ensure the relay didn't receive anything
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(server.messages.length).toBe(0);

    // @ts-expect-error
    relay.ready$.next(true);

    await expect(server).toReceiveMessage(["EVENT", mockEvent]);
  });
});

describe("notices$", () => {
  it("should not trigger connection to relay", async () => {
    subscribeSpyTo(relay.notices$);
    expect(relay.connected).toBe(false);
  });

  it("should accumulate notices in notices$ state", async () => {
    subscribeSpyTo(relay.req({ kinds: [1] }));

    // Send multiple NOTICE messages
    server.send(["NOTICE", "Notice 1"]);
    server.send(["NOTICE", "Notice 2"]);
    server.send(["NOTICE", "Notice 3"]);

    // Verify the notices state contains all messages
    expect(relay.notices$.value).toEqual(["Notice 1", "Notice 2", "Notice 3"]);
  });

  it("should ignore non-NOTICE messages", async () => {
    subscribeSpyTo(relay.req({ kinds: [1] }));

    server.send(["NOTICE", "Important notice"]);
    server.send(["OTHER", "other message"]);

    // Verify only NOTICE messages are in the state
    expect(relay.notices$.value).toEqual(["Important notice"]);
  });
});

describe("notice$", () => {
  it("should not trigger connection to relay", async () => {
    subscribeSpyTo(relay.notice$);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(relay.connected).toBe(false);
  });

  it("should emit NOTICE messages when they are received", async () => {
    const spy = subscribeSpyTo(relay.notice$);

    // Start connection
    subscribeSpyTo(relay.req({ kinds: [1] }));

    // Send multiple NOTICE messages
    server.send(["NOTICE", "Notice 1"]);
    server.send(["NOTICE", "Notice 2"]);
    server.send(["NOTICE", "Notice 3"]);

    // Verify the notices state contains all messages
    expect(spy.getValues()).toEqual(["Notice 1", "Notice 2", "Notice 3"]);
  });

  it("should ignore non-NOTICE messages", async () => {
    const spy = subscribeSpyTo(relay.notice$);

    // Start connection
    subscribeSpyTo(relay.req({ kinds: [1] }));

    server.send(["NOTICE", "Important notice"]);
    server.send(["OTHER", "other message"]);

    // Verify only NOTICE messages are in the state
    expect(spy.getValues()).toEqual(["Important notice"]);
  });
});

describe("message$", () => {
  it("should not trigger connection to relay", async () => {
    subscribeSpyTo(relay.message$);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(relay.connected).toBe(false);
  });

  it("should emit all messages when they are received", async () => {
    const spy = subscribeSpyTo(relay.message$);

    // Start connection
    subscribeSpyTo(relay.req({ kinds: [1] }));

    // Send multiple NOTICE messages
    server.send(["NOTICE", "Notice 1"]);
    server.send(["EVENT", "sub1", mockEvent]);
    server.send(["EOSE", "sub1"]);

    // Verify the notices state contains all messages
    expect(spy.getValues()).toEqual([
      ["NOTICE", "Notice 1"],
      ["EVENT", "sub1", mockEvent],
      ["EOSE", "sub1"],
    ]);
  });
});

describe("challenge$", () => {
  it("should not trigger connection to relay", async () => {
    subscribeSpyTo(relay.challenge$);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(relay.connected).toBe(false);
  });

  it("should set challenge$ when AUTH message received", async () => {
    subscribeSpyTo(relay.req({ kinds: [1] }));

    // Send AUTH message with challenge string
    server.send(["AUTH", "challenge-string-123"]);

    // Verify challenge$ was set
    expect(relay.challenge$.value).toBe("challenge-string-123");
  });

  it("should ignore non-AUTH messages", async () => {
    subscribeSpyTo(relay.req({ kinds: [1] }));

    server.send(["NOTICE", "Not a challenge"]);
    server.send(["OTHER", "other message"]);

    // Verify challenge$ remains null
    expect(relay.challenge$.value).toBe(null);
  });
});

describe("information$", () => {
  it("should fetch information document when information$ is subscribed to", async () => {
    // Mock the fetchInformationDocument method
    const mockInfo: RelayInformation = { ...defaultMockInfo, limitation: { auth_required: false } };
    vi.spyOn(Relay, "fetchInformationDocument").mockReturnValue(of(mockInfo));

    // Subscribe to information$
    const sub = subscribeSpyTo(relay.information$);

    // Verify fetchInformationDocument was called with the relay URL
    expect(Relay.fetchInformationDocument).toHaveBeenCalledWith(relay.url);

    // Verify the information was emitted
    expect(sub.getLastValue()).toEqual(mockInfo);
  });

  it("should return null when fetchInformationDocument fails", async () => {
    // Mock the fetchInformationDocument method to throw an error
    vi.spyOn(Relay, "fetchInformationDocument").mockReturnValue(throwError(() => new Error("Failed to fetch")));

    // Subscribe to information$
    const sub = subscribeSpyTo(relay.information$);

    // Verify fetchInformationDocument was called
    expect(Relay.fetchInformationDocument).toHaveBeenCalled();

    // Verify null was emitted
    expect(sub.getLastValue()).toBeNull();
  });

  it("should cache the information document", async () => {
    // Mock the fetchInformationDocument method
    const mockInfo: RelayInformation = { ...defaultMockInfo, limitation: { auth_required: true } };
    vi.spyOn(Relay, "fetchInformationDocument").mockReturnValue(of(mockInfo));

    // Subscribe to information$ multiple times
    const sub1 = subscribeSpyTo(relay.information$);
    const sub2 = subscribeSpyTo(relay.information$);

    // Verify fetchInformationDocument was called only once
    expect(Relay.fetchInformationDocument).toHaveBeenCalledTimes(1);

    // Verify both subscriptions received the same information
    expect(sub1.getLastValue()).toEqual(mockInfo);
    expect(sub2.getLastValue()).toEqual(mockInfo);

    // Verify the internal state was updated
    expect(relay.information).toEqual(mockInfo);
  });
});

describe("createReconnectTimer", () => {
  it("should create a reconnect timer when relay closes with error", async () => {
    const reconnectTimer = vi.fn().mockReturnValue(timer(1000));
    vi.spyOn(Relay, "createReconnectTimer").mockReturnValue(reconnectTimer);

    relay = new Relay("wss://test");
    const spy = subscribeSpyTo(relay.req([{ kinds: [1] }]), { expectErrors: true });

    // Send CLOSE message with error
    server.error({
      reason: "error message",
      code: 1000,
      wasClean: false,
    });

    // Verify the subscription errored
    expect(spy.receivedError()).toBe(true);

    expect(reconnectTimer).toHaveBeenCalledWith(expect.any(Error), 0);
  });

  it("should set ready$ to false until the reconnect timer completes", async () => {
    vi.useFakeTimers();
    const reconnectTimer = vi.fn().mockReturnValue(timer(1000));
    vi.spyOn(Relay, "createReconnectTimer").mockReturnValue(reconnectTimer);
    relay = new Relay("wss://test");

    subscribeSpyTo(relay.req([{ kinds: [1] }]), { expectErrors: true });

    // Send CLOSE message with error
    server.error({
      reason: "error message",
      code: 1000,
      wasClean: false,
    });

    // @ts-expect-error
    expect(relay.ready$.value).toBe(false);

    // Fast-forward time by 10ms
    await vi.advanceTimersByTimeAsync(5000);

    // @ts-expect-error
    expect(relay.ready$.value).toBe(true);
  });
});

describe("publish", () => {
  it("should retry when auth-required is received and authentication is completed", async () => {
    // First attempt to publish
    const spy = subscribeSpyTo(relay.publish(mockEvent));

    // Verify EVENT was sent
    await expect(server).toReceiveMessage(["EVENT", mockEvent]);

    // Send auth-required response
    server.send(["AUTH", "challenge-string"]);
    server.send(["OK", mockEvent.id, false, "auth-required: need to authenticate"]);

    // Send auth event
    const authEvent = { ...mockEvent, id: "auth-id" };
    subscribeSpyTo(relay.auth(authEvent));

    // Verify AUTH was sent
    await expect(server).toReceiveMessage(["AUTH", authEvent]);

    // Send successful auth response
    server.send(["OK", authEvent.id, true, ""]);

    // Wait for the event to be sent again
    await expect(server).toReceiveMessage(["EVENT", mockEvent]);

    // Send successful response for the retried event
    server.send(["OK", mockEvent.id, true, ""]);

    // Verify the final result is successful
    expect(spy.getLastValue()).toEqual({ ok: true, message: "", from: "wss://test" });
  });

  it("should error after max retries", async () => {
    const spy = subscribeSpyTo(relay.publish(mockEvent, { retries: 0 }), { expectErrors: true });

    // Close with error
    server.error({ reason: "error message", code: 1000, wasClean: false });

    // Verify the subscription errored
    expect(spy.receivedError()).toBe(true);
  });
});

describe("request", () => {
  it("should retry when auth-required is received and authentication is completed", async () => {
    // First attempt to request
    const spy = subscribeSpyTo(relay.request({ kinds: [1] }, { id: "sub1" }));

    // Verify REQ was sent
    await expect(server).toReceiveMessage(["REQ", "sub1", { kinds: [1] }]);

    // Send auth-required response
    server.send(["AUTH", "challenge-string"]);
    server.send(["CLOSED", "sub1", "auth-required: need to authenticate"]);

    // Wait for subscription to close
    await expect(server).toReceiveMessage(["CLOSE", "sub1"]);

    // Send auth event
    const authEvent = { ...mockEvent, id: "auth-id" };
    const authSpy = subscribeSpyTo(relay.auth(authEvent));

    // Verify AUTH was sent
    await expect(server).toReceiveMessage(["AUTH", authEvent]);
    server.send(["OK", authEvent.id, true, ""]);

    // Wait for auth to complete
    await authSpy.onComplete();

    // Wait for retry
    await expect(server).toReceiveMessage(["REQ", "sub1", { kinds: [1] }]);

    // Send response
    server.send(["EVENT", "sub1", mockEvent]);
    server.send(["EOSE", "sub1"]);

    // Verify the final result is successful
    expect(spy.getLastValue()).toEqual(expect.objectContaining(mockEvent));
    expect(spy.receivedComplete()).toBe(true);
  });
});

describe("subscription", () => {
  it("should retry when auth-required is received and authentication is completed", async () => {
    // First attempt to request
    const spy = subscribeSpyTo(relay.subscription({ kinds: [1] }, { id: "sub1" }));

    // Verify REQ was sent
    await expect(server).toReceiveMessage(["REQ", "sub1", { kinds: [1] }]);

    // Send auth-required response
    server.send(["AUTH", "challenge-string"]);
    server.send(["CLOSED", "sub1", "auth-required: need to authenticate"]);

    // Wait for subscription to close
    await expect(server).toReceiveMessage(["CLOSE", "sub1"]);

    // Send auth event
    const authEvent = { ...mockEvent, id: "auth-id" };
    const authSpy = subscribeSpyTo(relay.auth(authEvent));

    // Verify AUTH was sent
    await expect(server).toReceiveMessage(["AUTH", authEvent]);
    server.send(["OK", authEvent.id, true, ""]);

    // Wait for auth to complete
    await authSpy.onComplete();

    // Wait for retry
    await expect(server).toReceiveMessage(["REQ", "sub1", { kinds: [1] }]);

    // Send response
    server.send(["EVENT", "sub1", mockEvent]);
    server.send(["EOSE", "sub1"]);

    // Verify the final result is successful
    expect(spy.getValues()).toEqual([expect.objectContaining(mockEvent), "EOSE"]);
    expect(spy.receivedComplete()).toBe(false);
  });
});

// describe("keepAlive", () => {
//   it("should close the socket connection after keepAlive timeout", async () => {
//     vi.useFakeTimers();

//     // Set a short keepAlive timeout for testing
//     relay.keepAlive = 100; // 100ms for quick testing

//     // Subscribe to the relay to ensure it is active
//     const sub = subscribeSpyTo(relay.req([{ kinds: [1] }]));

//     // Wait for connection
//     await server.connected;

//     // Close the subscription
//     sub.unsubscribe();

//     // Fast-forward time by 10ms
//     await vi.advanceTimersByTimeAsync(10);

//     // should still be connected
//     expect(relay.connected).toBe(true);

//     // Wait for the keepAlive timeout to elapse
//     await vi.advanceTimersByTimeAsync(150);

//     expect(relay.connected).toBe(false);
//   });
// });
