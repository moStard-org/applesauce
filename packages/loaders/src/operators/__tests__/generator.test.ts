import { describe, expect, it } from "vitest";
import { lastValueFrom, of, toArray } from "rxjs";
import { TestScheduler } from "rxjs/testing";
import { generator } from "../generator.js";

let testScheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected);
});

describe("generator", () => {
  it("should work with normal generator functions", () => {
    testScheduler.run(({ expectObservable }) => {
      function* normalGenerator(value: number) {
        yield of(value + 1);
        yield of(value + 2);
        yield of(value + 3);
        yield value + 4;
      }

      const source$ = of(1).pipe(generator(normalGenerator));

      // Define expected marble diagram
      const expectedMarble = "(abcd|)";
      const expectedValues = {
        a: 2,
        b: 3,
        c: 4,
        d: 5,
      };

      expectObservable(source$).toBe(expectedMarble, expectedValues);
    });
  });

  it("should work with async generator functions", async () => {
    async function* asyncGenerator(value: string) {
      yield of(`${value}-1`);
      yield of(`${value}-2`);
      yield of(`${value}-3`);
      yield `${value}-4`;
    }

    const source$ = of("test").pipe(generator(asyncGenerator));

    const expectedValues = ["test-1", "test-2", "test-3", "test-4"];

    expect(await lastValueFrom(source$.pipe(toArray()))).toEqual(expectedValues);
  });
});
