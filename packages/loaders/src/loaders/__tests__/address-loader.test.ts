import { subscribeSpyTo } from "@hirez_io/observer-spy";
import { NostrEvent } from "nostr-tools";
import { Subject } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { FakeUser } from "../../__tests__/fake-user.js";
import { AddressPointersLoader, createAddressPointerLoadingSequence } from "../address-loader.js";

const user = new FakeUser();

afterEach(() => {
  vi.clearAllTimers();
});

describe("createAddressPointerLoadingSequence", () => {
  let result1: Subject<NostrEvent>;
  let loader1: Mock<AddressPointersLoader>;
  let result2: Subject<NostrEvent>;
  let loader2: Mock<AddressPointersLoader>;

  beforeEach(() => {
    result1 = new Subject<NostrEvent>();
    loader1 = vi.fn().mockReturnValue(result1.asObservable());
    result2 = new Subject<NostrEvent>();
    loader2 = vi.fn().mockReturnValue(result2.asObservable());
  });

  it("should call loaders in order", () => {
    const pointer = { kind: 0, pubkey: user.pubkey, relays: ["wss://relay.com"] };

    const loader = createAddressPointerLoadingSequence(loader1, loader2);
    const spy = subscribeSpyTo(loader([pointer]));

    expect(loader1).toHaveBeenCalledWith([pointer]);
    expect(loader2).not.toHaveBeenCalled();

    // Finish first loader with no results
    result1.complete();

    expect(loader2).toHaveBeenCalledWith([pointer]);
    result2.complete();

    // Loader should be complete now
    expect(spy.receivedComplete()).toBe(true);
  });

  it("should skip loader if loader throws an error", () => {
    const pointer = { kind: 0, pubkey: user.pubkey, relays: ["wss://relay.com"] };

    const loader = createAddressPointerLoadingSequence(loader1, loader2);
    const spy = subscribeSpyTo(loader([pointer]));

    // Finish first loader with an error
    result1.error(new Error("test"));

    // Second loader should be called
    expect(loader2).toHaveBeenCalled();
    result2.complete();

    // Loader should be complete now
    expect(spy.receivedComplete()).toBe(true);
  });

  it("should not request address pointers from second loader if first loader returns results", () => {
    const loader = createAddressPointerLoadingSequence(loader1, loader2);
    const spy = subscribeSpyTo(
      loader([
        { kind: 0, pubkey: user.pubkey },
        { kind: 0, pubkey: "other-pubkey" },
      ]),
    );

    const profile = user.profile({ name: "testing" });
    result1.next(profile);
    result1.complete();

    expect(loader2).toHaveBeenCalledWith([{ kind: 0, pubkey: "other-pubkey" }]);
    result2.complete();

    expect(spy.getValues()).toEqual([profile]);
    expect(spy.receivedComplete()).toBe(true);
  });

  it("should not request address pointer from second loader if first loader returns results and errors", () => {
    const loader = createAddressPointerLoadingSequence(loader1, loader2);
    const spy = subscribeSpyTo(
      loader([
        { kind: 0, pubkey: user.pubkey },
        { kind: 0, pubkey: "other-pubkey" },
      ]),
    );

    const profile = user.profile({ name: "testing" });
    result1.next(profile);
    result1.error(new Error("test"));

    expect(loader2).toHaveBeenCalledWith([{ kind: 0, pubkey: "other-pubkey" }]);
    result2.complete();

    expect(spy.getValues()).toEqual([profile]);
    expect(spy.receivedComplete()).toBe(true);
  });
});
