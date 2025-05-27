import { kinds, NostrEvent } from "nostr-tools";
import { describe, expect, it } from "vitest";
import { FakeUser } from "../../../__tests__/fake-user.js";
import { EventFactory } from "../../../event-factory.js";
import { setGiftWrapSeal, setSealRumor } from "../gift-wrap.js";

const user = new FakeUser();

describe("setGiftWrapSeal", () => {
  it("should set the seal on the gift wrap", async () => {
    const seal = user.event({ kind: kinds.Seal, content: "test" });

    const draft = (await EventFactory.runProcess(
      { kind: kinds.GiftWrap },
      { signer: user },
      setGiftWrapSeal(user.pubkey, seal),
    )) as NostrEvent;

    expect(await user.nip44.decrypt(draft.pubkey, draft.content)).toEqual(JSON.stringify(seal));
  });

  it("should sign seal with signer if not signed", async () => {
    const seal = user.event({ kind: kinds.Seal, content: "test" });
    Reflect.deleteProperty(seal, "sig");

    const draft = (await EventFactory.runProcess(
      { kind: kinds.GiftWrap },
      { signer: user },
      setGiftWrapSeal(user.pubkey, seal),
    )) as NostrEvent;

    const content = await user.nip44.decrypt(draft.pubkey, draft.content);
    expect(JSON.parse(content)).toEqual(expect.objectContaining({ ...seal, sig: expect.any(String) }));
  });

  it("should stamp seal if its missing pubkey", async () => {
    const seal = user.event({ kind: kinds.Seal, content: "test" });
    Reflect.deleteProperty(seal, "id");
    Reflect.deleteProperty(seal, "pubkey");
    Reflect.deleteProperty(seal, "sig");

    const draft = (await EventFactory.runProcess(
      { kind: kinds.GiftWrap },
      { signer: user },
      setGiftWrapSeal(user.pubkey, seal),
    )) as NostrEvent;

    const content = await user.nip44.decrypt(draft.pubkey, draft.content);
    expect(JSON.parse(content)).toEqual(
      expect.objectContaining({ ...seal, id: expect.any(String), pubkey: user.pubkey, sig: expect.any(String) }),
    );
  });
});

describe("setSealRumor", () => {
  it("should strip signature from rumor", async () => {
    const event = user.event({ kind: 1234, content: "test" });

    const draft = await EventFactory.runProcess(
      { kind: kinds.Seal },
      { signer: user },
      setSealRumor(user.pubkey, event),
    );

    const content = await user.nip44.decrypt(user.pubkey, draft.content);
    expect(JSON.parse(content)).toEqual({
      id: event.id,
      kind: event.kind,
      pubkey: user.pubkey,
      content: event.content,
      tags: event.tags,
      created_at: event.created_at,
    });
  });

  it("should stamp rumor if its missing pubkey", async () => {
    const event = user.event({ kind: 1234, content: "test" });
    Reflect.deleteProperty(event, "id");
    Reflect.deleteProperty(event, "pubkey");
    Reflect.deleteProperty(event, "sig");

    const draft = await EventFactory.runProcess(
      { kind: kinds.Seal },
      { signer: user },
      setSealRumor(user.pubkey, event),
    );

    const content = await user.nip44.decrypt(user.pubkey, draft.content);
    expect(JSON.parse(content)).toEqual({
      id: expect.any(String),
      kind: event.kind,
      pubkey: user.pubkey,
      content: event.content,
      tags: event.tags,
      created_at: event.created_at,
    });
  });
});
