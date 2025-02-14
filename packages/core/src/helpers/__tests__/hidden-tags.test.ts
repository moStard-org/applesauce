import { describe, beforeEach, it, expect } from "vitest";
import { finalizeEvent, generateSecretKey, getPublicKey, kinds, nip04, NostrEvent } from "nostr-tools";

import { getHiddenTags, HiddenTagsSigner, unlockHiddenTags } from "../hidden-tags.js";
import { unixNow } from "../time.js";

const key = generateSecretKey();
const pubkey = getPublicKey(key);
const signer: HiddenTagsSigner = {
  nip04: {
    encrypt: (pubkey: string, plaintext: string) => nip04.encrypt(key, pubkey, plaintext),
    decrypt: (pubkey: string, ciphertext: string) => nip04.decrypt(key, pubkey, ciphertext),
  },
};

describe("Private Lists", () => {
  describe("unlockHiddenTags", () => {
    let list: NostrEvent;

    beforeEach(async () => {
      list = finalizeEvent(
        {
          kind: kinds.Mutelist,
          created_at: unixNow(),
          content: await nip04.encrypt(
            key,
            pubkey,
            JSON.stringify([["p", "npub1ye5ptcxfyyxl5vjvdjar2ua3f0hynkjzpx552mu5snj3qmx5pzjscpknpr"]]),
          ),
          tags: [],
        },
        key,
      );
    });

    it("should unlock hidden tags", async () => {
      await unlockHiddenTags(list, signer);

      expect(getHiddenTags(list)).toEqual(
        expect.arrayContaining([["p", "npub1ye5ptcxfyyxl5vjvdjar2ua3f0hynkjzpx552mu5snj3qmx5pzjscpknpr"]]),
      );
    });
  });
});
