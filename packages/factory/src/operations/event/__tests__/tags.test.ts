import { describe, it, expect, beforeEach } from "vitest";
import { FakeUser } from "../../../__tests__/fake-user.js";
import { EncryptedContentSymbol, unixNow } from "applesauce-core/helpers";
import { modifyHiddenTags } from "../tags.js";
import { kinds } from "nostr-tools";

describe("modifyHiddenTags", () => {
  let user: FakeUser;

  beforeEach(() => {
    user = new FakeUser();
  });

  it("should not modify event if no operations are provided", async () => {
    const draft = {
      kind: kinds.BookmarkList,
      content: "original content",
      tags: [["p", "pubkey"]],
      created_at: unixNow(),
    };

    const operation = modifyHiddenTags();
    const result = await operation(draft, { signer: user });

    expect(result).toEqual(draft);
  });

  it("should set EncryptedContentSymbol with plaintext hidden tags", async () => {
    const operation = modifyHiddenTags((tags) => [...tags, ["e", "test-id"]]);
    const draft = await operation(
      { kind: kinds.BookmarkList, content: "", tags: [], created_at: unixNow() },
      { signer: user },
    );

    expect(Reflect.get(draft, EncryptedContentSymbol)).toBe(JSON.stringify([["e", "test-id"]]));
  });

  it("should not override existing EncryptedContentSymbol when modifying hidden tags", async () => {
    // First create a draft with hidden content symbol
    const draft = {
      kind: kinds.BookmarkList,
      content: "",
      tags: [],
      created_at: unixNow(),
      [EncryptedContentSymbol]: JSON.stringify([["e", "old-id"]]),
    };

    // Modify the hidden tags
    const operation = modifyHiddenTags((tags) => [...tags, ["e", "new-id"]]);
    const result = await operation(draft, { signer: user });

    expect(Reflect.get(result, EncryptedContentSymbol)).toBe(JSON.stringify([["e", "new-id"]]));
    expect(Reflect.get(result, EncryptedContentSymbol)).not.toBe(Reflect.get(draft, EncryptedContentSymbol));
  });
});
