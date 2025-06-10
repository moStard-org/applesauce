import { describe, expect, it } from "vitest";
import { createDefer, Deferred } from "../deferred";

describe("createDefer", () => {
  it("should create a deferred promise with resolve and reject methods", () => {
    const deferred = createDefer<string>();

    expect(deferred).toBeInstanceOf(Promise);
    expect(typeof deferred.resolve).toBe("function");
    expect(typeof deferred.reject).toBe("function");
  });

  it("should resolve the promise when resolve is called", async () => {
    const deferred = createDefer<string>();
    const testValue = "test value";

    // Resolve the promise
    deferred.resolve(testValue);

    // The promise should resolve with the test value
    await expect(deferred).resolves.toBe(testValue);
  });

  it("should reject the promise when reject is called", async () => {
    const deferred = createDefer<string>();
    const testError = new Error("test error");

    // Reject the promise
    deferred.reject(testError);

    // The promise should reject with the test error
    await expect(deferred).rejects.toBe(testError);
  });

  it("should resolve with undefined when no value is provided", async () => {
    const deferred = createDefer<undefined>();

    deferred.resolve();

    await expect(deferred).resolves.toBeUndefined();
  });

  it("should resolve with a promise-like value", async () => {
    const deferred = createDefer<string>();
    const promiseLike = Promise.resolve("promise value");

    deferred.resolve(promiseLike);

    await expect(deferred).resolves.toBe("promise value");
  });

  it("should handle multiple resolve calls (only first one should take effect)", async () => {
    const deferred = createDefer<string>();

    deferred.resolve("first");
    deferred.resolve("second"); // This should be ignored

    await expect(deferred).resolves.toBe("first");
  });

  it("should handle multiple reject calls (only first one should take effect)", async () => {
    const deferred = createDefer<string>();
    const firstError = new Error("first error");
    const secondError = new Error("second error");

    deferred.reject(firstError);
    deferred.reject(secondError); // This should be ignored

    await expect(deferred).rejects.toBe(firstError);
  });

  it("should ignore reject after resolve", async () => {
    const deferred = createDefer<string>();

    deferred.resolve("resolved");
    deferred.reject(new Error("should be ignored"));

    await expect(deferred).resolves.toBe("resolved");
  });

  it("should ignore resolve after reject", async () => {
    const deferred = createDefer<string>();
    const testError = new Error("rejected");

    deferred.reject(testError);
    deferred.resolve("should be ignored");

    await expect(deferred).rejects.toBe(testError);
  });

  it("should allow chaining with then/catch like a regular promise", async () => {
    const deferred = createDefer<string>();

    const chainedPromise = deferred.then((value) => value.toUpperCase()).then((value) => `${value}!`);

    deferred.resolve("hello");

    await expect(chainedPromise).resolves.toBe("HELLO!");
  });

  it("should work with async/await", async () => {
    const deferred = createDefer<string>();

    // Resolve after a short delay
    setTimeout(() => {
      deferred.resolve("async result");
    }, 10);

    const result = await deferred;
    expect(result).toBe("async result");
  });

  it("should handle rejection with async/await", async () => {
    const deferred = createDefer<string>();
    const testError = new Error("async error");

    // Reject after a short delay
    setTimeout(() => {
      deferred.reject(testError);
    }, 10);

    await expect(async () => {
      await deferred;
    }).rejects.toBe(testError);
  });
});

describe("Deferred type", () => {
  it("should have correct type signature", () => {
    const deferred: Deferred<string> = createDefer<string>();

    // Should be assignable to Promise<string>
    const promise: Promise<string> = deferred;
    expect(promise).toBe(deferred);

    // Should have resolve and reject methods
    expect(typeof deferred.resolve).toBe("function");
    expect(typeof deferred.reject).toBe("function");
  });
});
