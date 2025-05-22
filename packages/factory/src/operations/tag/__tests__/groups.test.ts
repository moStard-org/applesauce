import { GroupPointer } from "applesauce-core/helpers";
import { describe, expect, it } from "vitest";
import { addGroupTag } from "../groups.js";

describe("addGroupTag", () => {
  it("should replace existing tag", () => {
    const group: GroupPointer = { id: "testing", relay: "wss://relay.com", name: "new-name" };

    expect(addGroupTag(group)([["group", "testing", "wss://relay.com"]], {})).toEqual([
      ["group", "testing", "wss://relay.com/", "new-name"],
    ]);
  });

  it("should respect relay", () => {
    const group: GroupPointer = { id: "testing", relay: "wss://relay.com", name: "new-name" };

    expect(addGroupTag(group)([["group", "testing", "wss://other.relay.com"]], {})).toEqual([
      ["group", "testing", "wss://other.relay.com"],
      ["group", "testing", "wss://relay.com/", "new-name"],
    ]);
  });
});
