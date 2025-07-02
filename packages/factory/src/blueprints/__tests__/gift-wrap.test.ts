import { NostrEvent } from "nostr-tools";
import { describe, expect, it } from "vitest";
import { FakeUser } from "../../__tests__/fake-user.js";
import { EventFactory } from "../../event-factory.js";
import { GiftWrapBlueprint } from "../gift-wrap.js";
import { NoteBlueprint } from "../note.js";

const user = new FakeUser();
const other = new FakeUser();
const factory = new EventFactory({ signer: user });

describe("GiftWrapBlueprint", () => {
  it("should create a gift wrap event", async () => {
    const giftwrap = await factory.create(GiftWrapBlueprint, other.pubkey, NoteBlueprint("hello world"));

    expect(giftwrap.pubkey).not.toBe(user.pubkey);
    const seal = JSON.parse(await other.nip44.decrypt(giftwrap.pubkey, giftwrap.content)) as NostrEvent;

    expect(seal.pubkey).toBe(user.pubkey);
    const rumor = JSON.parse(await other.nip44.decrypt(seal.pubkey, seal.content)) as NostrEvent;

    expect(rumor).toEqual({
      id: expect.any(String),
      kind: 1,
      content: "hello world",
      pubkey: user.pubkey,
      tags: [],
      created_at: expect.any(Number),
    });
  });

  it("should include single p tag for address", async () => {
    const event = await factory.create(GiftWrapBlueprint, other.pubkey, NoteBlueprint("hello world"));

    expect(event.tags).toEqual([["p", other.pubkey]]);
  });
});
