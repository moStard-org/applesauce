import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "TimeoutError",
        "defined",
        "firstValueFrom",
        "getObservableValue",
        "lastValueFrom",
        "listenLatestUpdates",
        "mapEventsToStore",
        "simpleTimeout",
        "watchEventUpdates",
        "withImmediateValueOrDefault",
      ]
    `);
  });
});
