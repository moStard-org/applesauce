import { describe, expect, it } from "vitest";
import { getReactionEventPointer } from "../reactions.js";
import { FakeUser } from "../../__tests__/fixtures.js";

const user = new FakeUser();

describe("getReactionEventPointer", () => {
  it("returns undefined if e tag is missing", () => {
    const event = user.event({
      kind: 7,
      tags: [["p", user.pubkey]],
      content: "+",
    });

    const result = getReactionEventPointer(event);
    expect(result).toBeUndefined();
  });

  it("returns event pointer for e tag", () => {
    const event = user.event({
      kind: 7,
      tags: [["e", "event123"]],
      content: "+",
    });

    const result = getReactionEventPointer(event);
    expect(result).toBeDefined();
    expect(result?.id).toBe("event123");
  });

  it("gets relay hints from e tag", () => {
    const event = user.event({
      kind: 7,
      tags: [["e", "event123", "wss://relay.example.com"]],
      content: "+",
    });

    const result = getReactionEventPointer(event);
    expect(result).toBeDefined();
    expect(result?.relays).toContain("wss://relay.example.com");
  });

  it("gets relay hints from both e tag and p tag", () => {
    const event = user.event({
      kind: 7,
      tags: [
        ["e", "event123", "wss://relay1.example.com/"],
        ["p", user.pubkey, "wss://relay2.example.com/"],
      ],
      content: "+",
    });

    const result = getReactionEventPointer(event);
    expect(result).toBeDefined();
    expect(result?.relays).toContain("wss://relay1.example.com/");
    expect(result?.relays).toContain("wss://relay2.example.com/");
  });

  it("gets author from p tag", () => {
    const event = user.event({
      kind: 7,
      tags: [
        ["e", "event123"],
        ["p", user.pubkey],
      ],
      content: "+",
    });

    const result = getReactionEventPointer(event);
    expect(result).toBeDefined();
    expect(result?.author).toBe(user.pubkey);
  });

  it("gets event kind from k tag", () => {
    const event = user.event({
      kind: 7,
      tags: [
        ["e", "event123"],
        ["k", "1"],
      ],
      content: "+",
    });

    const result = getReactionEventPointer(event);
    expect(result).toBeDefined();
    expect(result?.kind).toBe(1);
  });

  it("ignores non-integer k tag values", () => {
    const event = user.event({
      kind: 7,
      tags: [
        ["e", "event123"],
        ["k", "invalid"],
      ],
      content: "+",
    });

    const result = getReactionEventPointer(event);
    expect(result).toBeDefined();
    expect(result?.kind).toBeUndefined();
  });
});
