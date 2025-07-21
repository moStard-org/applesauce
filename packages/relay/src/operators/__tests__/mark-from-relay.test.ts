import { describe, expect, it } from "vitest";
import { of } from "rxjs";
import { subscribeSpyTo } from "@hirez_io/observer-spy";
import { getSeenRelays } from "applesauce-core/helpers";
import { markFromRelay } from "../mark-from-relay.js";
import { FakeUser } from "../../__tests__/fake-user.js";
import { SubscriptionResponse } from "../../types.js";

const user = new FakeUser();

describe("markFromRelay", () => {
  it("should mark NostrEvent objects with the relay URL", () => {
    const relayUrl = "wss://test-relay.com";
    const event = user.note("test content");
    const source = of<SubscriptionResponse>(event);

    const spy = subscribeSpyTo(source.pipe(markFromRelay(relayUrl)));

    expect(getSeenRelays(event)).toContain(relayUrl);
    expect(spy.getValues()).toEqual([event]);
  });

  it("should not process string messages", () => {
    const relayUrl = "wss://test-relay.com";
    const source = of<SubscriptionResponse>("EOSE");

    const spy = subscribeSpyTo(source.pipe(markFromRelay(relayUrl)));

    expect(spy.getValues()).toEqual(["EOSE"]);
  });

  it("should handle mixed stream of events and strings", () => {
    const relayUrl = "wss://test-relay.com";
    const event1 = user.note("first note");
    const event2 = user.note("second note");
    const source = of(event1 as SubscriptionResponse, "EOSE" as SubscriptionResponse, event2 as SubscriptionResponse);

    const spy = subscribeSpyTo(source.pipe(markFromRelay(relayUrl)));

    expect(getSeenRelays(event1)).toContain(relayUrl);
    expect(getSeenRelays(event2)).toContain(relayUrl);
    expect(spy.getValues()).toEqual([event1, "EOSE", event2]);
  });

  it("should accumulate multiple relay URLs on the same event", () => {
    const relayUrl1 = "wss://relay1.com";
    const relayUrl2 = "wss://relay2.com";
    const event = user.note("shared note");

    // First relay marks the event
    const source1 = of<SubscriptionResponse>(event);
    subscribeSpyTo(source1.pipe(markFromRelay(relayUrl1)));

    // Second relay marks the same event
    const source2 = of<SubscriptionResponse>(event);
    subscribeSpyTo(source2.pipe(markFromRelay(relayUrl2)));

    const seenRelays = getSeenRelays(event);
    expect(seenRelays).toContain(relayUrl1);
    expect(seenRelays).toContain(relayUrl2);
    expect(seenRelays?.size).toBe(2);
  });
});
