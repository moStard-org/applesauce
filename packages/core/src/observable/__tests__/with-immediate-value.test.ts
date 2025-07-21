import { describe, expect, it } from "vitest";
import { combineLatest, EMPTY, NEVER, of, shareReplay } from "rxjs";

import { withImmediateValueOrDefault } from "../with-immediate-value.js";

describe("withImmediateValueOrDefault", () => {
  it("should not override the immediate value", () => {
    let values: any[] = [];
    const source = of(1);
    const result = source.pipe(withImmediateValueOrDefault(0));
    result.subscribe((v) => values.push(v));
    expect(values).toEqual([1]);
  });

  it("should emit default if no value is emitted (NEVER)", () => {
    let values: any[] = [];
    const source = NEVER;
    const result = source.pipe(withImmediateValueOrDefault(0));
    result.subscribe((v) => values.push(v));
    expect(values).toEqual([0]);
  });

  it("should emit default if no value is emitted (combineLatest)", () => {
    let values: any[] = [];
    const source = combineLatest([of(1), of(2)]);
    const result = source.pipe(withImmediateValueOrDefault(0));
    result.subscribe((v) => values.push(v));
    expect(values).toEqual([[1, 2]]);
  });

  it("should work with shareReplay", () => {
    let values: any[] = [];
    const source = of(1).pipe(shareReplay(1));
    source.subscribe();

    source.pipe(withImmediateValueOrDefault(0)).subscribe((v) => values.push(v));
    expect(values).toEqual([1]);
  });
});
