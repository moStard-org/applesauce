import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "Database",
        "EventStore",
        "EventStoreSymbol",
        "Helpers",
        "Queries",
        "QueryStore",
        "TimeoutError",
        "defined",
        "firstValueFrom",
        "getObservableValue",
        "lastValueFrom",
        "listenLatestUpdates",
        "logger",
        "mapEventsToStore",
        "mapEventsToTimeline",
        "simpleTimeout",
        "watchEventUpdates",
        "withImmediateValueOrDefault",
      ]
    `);
  });
});
