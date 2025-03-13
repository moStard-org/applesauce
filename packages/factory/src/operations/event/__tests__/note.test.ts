import { describe, expect, it } from "vitest";
import { FakeUser } from "../../../__tests__/fake-user.js";
import { includeNoteThreadingNotifyTags } from "../note.js";

const user = new FakeUser();

describe("includeNoteThreadingNotifyTags", () => {
  it('should copy all "p" tags', async () => {
    const parent = user.note("what are you talking about?", { tags: [["p", "pubkey"]] });

    expect(
      await includeNoteThreadingNotifyTags(parent)({ kind: 1, content: "Im not sure", created_at: 0, tags: [] }, {}),
    ).toEqual(
      expect.objectContaining({
        tags: [
          ["p", "pubkey"],
          ["p", user.pubkey],
        ],
      }),
    );
  });

  it('should not copy "mention" "p" tags', async () => {
    const parent = user.note("what are you talking about?", { tags: [["p", "pubkey", "", "mention"]] });

    expect(
      await includeNoteThreadingNotifyTags(parent)({ kind: 1, content: "Im not sure", created_at: 0, tags: [] }, {}),
    ).toEqual(
      expect.objectContaining({
        tags: [["p", user.pubkey]],
      }),
    );
  });

  it('should not add duplicate "p" tags', async () => {
    const parent = user.note("what are you talking about?", { tags: [["p", user.pubkey]] });

    expect(
      await includeNoteThreadingNotifyTags(parent)({ kind: 1, content: "Im not sure", created_at: 0, tags: [] }, {}),
    ).toEqual(
      expect.objectContaining({
        tags: [["p", user.pubkey]],
      }),
    );
  });
});
