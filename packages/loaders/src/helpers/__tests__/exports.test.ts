import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "IdentityStatus",
        "batchLoader",
        "consolidateAddressPointers",
        "consolidateEventPointers",
        "createFilterFromAddressPointers",
        "createFiltersFromAddressPointers",
        "getIdentitiesFromJson",
        "getIdentityFromJson",
        "getRelaysFromPointers",
        "groupAddressPointersByKind",
        "groupAddressPointersByPubkey",
        "groupAddressPointersByPubkeyOrKind",
        "isLoadableAddressPointer",
        "makeCacheRequest",
        "normalizeIdentityJson",
        "unwrapCacheRequest",
      ]
    `);
  });
});
