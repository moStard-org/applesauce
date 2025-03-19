import { beforeEach, describe, expect, it } from "vitest";
import { EventStore } from "applesauce-core";
import { EventFactory } from "applesauce-factory";
import { kinds } from "nostr-tools";
import { unlockHiddenTags } from "applesauce-core/helpers";
import { subscribeSpyTo } from "@hirez_io/observer-spy";

import { FakeUser } from "../../__tests__/fake-user.js";
import { ActionHub } from "../../action-hub.js";
import { AddUserToFollowSet, RemoveUserFromFollowSet } from "../follow-sets.js";

const user = new FakeUser();
const testPubkey = "test-pubkey";
const testIdentifier = "test-list";

let events: EventStore;
let factory: EventFactory;
let hub: ActionHub;

beforeEach(() => {
  events = new EventStore();
  factory = new EventFactory({ signer: user });
  hub = new ActionHub(events, factory);

  // Add a follow set event to work with
  const followSet = user.event({
    kind: kinds.Followsets,
    tags: [["d", testIdentifier]],
    content: "",
    created_at: Math.floor(Date.now() / 1000),
  });
  events.add(followSet);
});

describe("AddUserToList", () => {
  it("should add a pubkey to public tags in a follow set", async () => {
    const spy = subscribeSpyTo(hub.exec(AddUserToFollowSet, testPubkey, testIdentifier), { expectErrors: false });
    await spy.onComplete();

    const emittedEvent = spy.getLastValue();
    expect(emittedEvent).toMatchObject({
      kind: kinds.Followsets,
      tags: expect.arrayContaining([
        ["d", testIdentifier],
        ["p", testPubkey],
      ]),
    });
  });

  it("should add a pubkey to hidden tags in a follow set", async () => {
    const spy = subscribeSpyTo(hub.exec(AddUserToFollowSet, testPubkey, testIdentifier, true), { expectErrors: false });
    await spy.onComplete();

    const emittedEvent = spy.getLastValue()!;
    expect(await unlockHiddenTags(emittedEvent, user)).toEqual(expect.arrayContaining([["p", testPubkey]]));
  });
});

describe("RemoveUserFromList", () => {
  beforeEach(async () => {
    // Add a follow set with existing tags to remove
    const followSetWithTags = user.event({
      kind: kinds.Followsets,
      tags: [
        ["d", testIdentifier],
        ["p", testPubkey],
      ],
      content: await user.nip04.encrypt(user.pubkey, JSON.stringify(["p", testPubkey])),
      created_at: Math.floor(Date.now() / 1000),
    });
    events.add(followSetWithTags);
  });

  it("should remove a pubkey from public tags in a follow set", async () => {
    const spy = subscribeSpyTo(hub.exec(RemoveUserFromFollowSet, testPubkey, testIdentifier), { expectErrors: false });
    await spy.onComplete();

    const emittedEvent = spy.getLastValue();
    expect(emittedEvent).toMatchObject({
      kind: kinds.Followsets,
      tags: expect.not.arrayContaining([["p", testPubkey]]),
    });
  });

  it("should remove a pubkey from hidden tags in a follow set", async () => {
    const spy = subscribeSpyTo(hub.exec(RemoveUserFromFollowSet, testPubkey, testIdentifier, true), {
      expectErrors: false,
    });
    await spy.onComplete();

    const emittedEvent = spy.getLastValue()!;
    expect(await unlockHiddenTags(emittedEvent, user)).toEqual(
      expect.not.arrayContaining([["hidden", "p", testPubkey]]),
    );
  });
});
