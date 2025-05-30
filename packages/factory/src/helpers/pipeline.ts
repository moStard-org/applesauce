// Copied from rxjs pipe() method and modified to support context

import { EncryptedContentSymbol } from "applesauce-core/helpers";
import { EventFactoryContext, EventOperation, Operation, TagOperation } from "../types.js";

export function identity<T>(x: T): T {
  return x;
}

/** The core method that creates a pipeline to build an event */
export function eventPipe(...operations: (EventOperation | undefined)[]): EventOperation {
  return pipeFromAsyncArray(
    operations.filter((o) => !!o),
    [EncryptedContentSymbol],
  );
}

/** The core method that creates a pipeline to create or modify an array of tags */
export function tagPipe(...operations: (TagOperation | undefined)[]): TagOperation {
  return pipeFromAsyncArray(operations.filter((o) => !!o));
}

/** A pipeline operation that does nothing */
export function skip<T>(): (value: T) => T {
  return (value) => value;
}

/**
 * @param fns - An array of operations to pipe together
 * @param preserve - An array of symbols to copy from each operation to the next
 * @internal
 */
export function pipeFromAsyncArray<T, R>(fns: Array<Operation<T, R>>, preserve?: (symbol | string)[]): Operation<T, R> {
  if (fns.length === 0) return identity as Operation<any, any>;

  return async function piped(input: T, context: EventFactoryContext): Promise<R> {
    return fns.reduce(async (prev: any, fn: Operation<T, R>) => {
      const result = await fn(await prev, context);

      // Copy the symbols and fields if result is an object
      if (preserve && typeof result === "object" && result !== null && typeof prev === "object" && prev !== null) {
        for (const symbol of preserve) {
          if (Reflect.has(prev, symbol)) Reflect.set(result, symbol, Reflect.get(prev, symbol));
        }
      }

      return result;
    }, input as any);
  };
}
