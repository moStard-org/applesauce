import { subscribeSpyTo } from "@hirez_io/observer-spy";
import { EMPTY, from } from "rxjs";
import { describe, expect, it, vi } from "vitest";

import { FakeUser } from "../../__tests__/fake-user.js";
import { filterBlockLoader } from "../timeline-loader.js";

const user = new FakeUser();

describe("filterBlockLoader", () => {
  it("should not set until on first call", () => {
    const request = vi.fn().mockReturnValue(from([]));
    const loader = filterBlockLoader(request, [{ kinds: [1] }]);

    subscribeSpyTo(loader());

    expect(request).toHaveBeenCalledWith([{ kinds: [1] }]);
  });

  it("should set until to earliest event", () => {
    const first = user.note("hello");
    const second = user.note("nostr", { created_at: first.created_at - 100 });
    const request = vi.fn();
    const loader = filterBlockLoader(request, [{ kinds: [1] }]);

    // First page
    request.mockReturnValueOnce(from([first, second]));
    subscribeSpyTo(loader());
    expect(request).toHaveBeenCalledWith([{ kinds: [1], until: undefined, limit: undefined }]);

    // Second page
    request.mockReturnValueOnce(EMPTY);
    subscribeSpyTo(loader());
    expect(request).toHaveBeenCalledWith([{ kinds: [1], until: second.created_at - 1, limit: undefined }]);
  });

  it("should not request if since is after cursor", () => {
    const event = user.note("hello");
    const request = vi.fn().mockReturnValue(from([event]));
    const loader = filterBlockLoader(request, [{ kinds: [1] }]);

    subscribeSpyTo(loader());
    expect(request).toHaveBeenCalled();

    // Call with a newer ts
    subscribeSpyTo(loader(event.created_at + 20));
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("should not call request anymore once complete", () => {
    const event = user.note("hello");
    const request = vi.fn().mockReturnValue(from([event]));
    const loader = filterBlockLoader(request, [{ kinds: [1] }]);

    // First page
    subscribeSpyTo(loader());
    expect(request).toHaveBeenCalled();

    // Second page
    request.mockReturnValueOnce(EMPTY);
    subscribeSpyTo(loader());
    expect(request).toHaveBeenCalledTimes(2);

    // Should not load anymore
    subscribeSpyTo(loader(event.created_at + 20));
    expect(request).toHaveBeenCalledTimes(2);

    // Should not load anymore
    subscribeSpyTo(loader());
    expect(request).toHaveBeenCalledTimes(2);
  });
});
