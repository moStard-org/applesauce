import { describe, it, expect, vi } from "vitest";
import { EMPTY } from "rxjs";
import { makeUpstreamRequest } from "../upstream.js";

describe("makeUpstreamRequest", () => {
  it("should handle a method", () => {
    const request = vi.fn().mockImplementation(() => EMPTY);
    makeUpstreamRequest(request, ["wss://relay.com"], [{ kinds: [1] }]);
    expect(request).toHaveBeenCalledWith(["wss://relay.com"], [{ kinds: [1] }]);
  });

  it("should handle a pool object", () => {
    const request = vi.fn().mockImplementation(() => EMPTY);
    makeUpstreamRequest({ request }, ["wss://relay.com"], [{ kinds: [1] }]);
    expect(request).toHaveBeenCalledWith(["wss://relay.com"], [{ kinds: [1] }]);
  });
});
