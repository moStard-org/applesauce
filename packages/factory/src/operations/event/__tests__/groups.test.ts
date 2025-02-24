import { describe, expect, it } from "vitest";
import { unixNow } from "applesauce-core/helpers";

import { includeGroupHTag, includeGroupPreviousTags } from "../groups.js";
import { finalizeEvent, generateSecretKey, NostrEvent } from "nostr-tools";

describe("includeGroupHTag", () => {
  it('should include "h" tag', () => {
    expect(
      includeGroupHTag({ id: "group", relay: "groups.relay.com" })(
        { kind: 9, content: "hello world", created_at: unixNow(), tags: [] },
        {},
      ),
    ).toEqual(expect.objectContaining({ tags: expect.arrayContaining([["h", "group"]]) }));
  });

  it('should override "h" tag if it exists', () => {
    expect(
      includeGroupHTag({ id: "group", relay: "groups.relay.com" })(
        { kind: 9, content: "hello world", created_at: unixNow(), tags: [["h", "other-group"]] },
        {},
      ),
    ).toEqual(expect.objectContaining({ tags: expect.arrayContaining([["h", "group"]]) }));
  });
});

describe("includeGroupHTag", () => {
  it('should include "previous" tags from events', () => {
    const key = generateSecretKey();
    const previous: NostrEvent[] = Array(5)
      .fill("hello world")
      .map((content, i) =>
        finalizeEvent({ kind: 9, content, tags: [["h", "group"]], created_at: unixNow() - i * 50 }, key),
      );

    expect(
      includeGroupPreviousTags(previous, 5)(
        { kind: 9, content: "hello bots", created_at: unixNow(), tags: [["h", "group"]] },
        {},
      ),
    ).toEqual(
      expect.objectContaining({ tags: expect.arrayContaining(previous.map((e) => ["previous", e.id.slice(0, 8)])) }),
    );
  });
});
