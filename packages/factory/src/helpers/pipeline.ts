// Copied from rxjs pipe() method and modified to support context

import { EventFactoryContext, Operation, TagOperation } from "../types.js";

export function identity<T>(x: T): T {
  return x;
}

export function pipe(): typeof identity;
export function pipe<T, A>(fn1: Operation<T, A>): Operation<T, A>;
export function pipe<T, A, B>(fn1: Operation<T, A>, fn2: Operation<A, B>): Operation<T, B>;
export function pipe<T, A, B, C>(fn1: Operation<T, A>, fn2: Operation<A, B>, fn3: Operation<B, C>): Operation<T, C>;
export function pipe<T, A, B, C, D>(
  fn1: Operation<T, A>,
  fn2: Operation<A, B>,
  fn3: Operation<B, C>,
  fn4: Operation<C, D>,
): Operation<T, D>;
export function pipe<T, A, B, C, D, E>(
  fn1: Operation<T, A>,
  fn2: Operation<A, B>,
  fn3: Operation<B, C>,
  fn4: Operation<C, D>,
  fn5: Operation<D, E>,
): Operation<T, E>;
export function pipe<T, A, B, C, D, E, F>(
  fn1: Operation<T, A>,
  fn2: Operation<A, B>,
  fn3: Operation<B, C>,
  fn4: Operation<C, D>,
  fn5: Operation<D, E>,
  fn6: Operation<E, F>,
): Operation<T, F>;
export function pipe<T, A, B, C, D, E, F, G>(
  fn1: Operation<T, A>,
  fn2: Operation<A, B>,
  fn3: Operation<B, C>,
  fn4: Operation<C, D>,
  fn5: Operation<D, E>,
  fn6: Operation<E, F>,
  fn7: Operation<F, G>,
): Operation<T, G>;
export function pipe<T, A, B, C, D, E, F, G, H>(
  fn1: Operation<T, A>,
  fn2: Operation<A, B>,
  fn3: Operation<B, C>,
  fn4: Operation<C, D>,
  fn5: Operation<D, E>,
  fn6: Operation<E, F>,
  fn7: Operation<F, G>,
  fn8: Operation<G, H>,
): Operation<T, H>;
export function pipe<T, A, B, C, D, E, F, G, H, I>(
  fn1: Operation<T, A>,
  fn2: Operation<A, B>,
  fn3: Operation<B, C>,
  fn4: Operation<C, D>,
  fn5: Operation<D, E>,
  fn6: Operation<E, F>,
  fn7: Operation<F, G>,
  fn8: Operation<G, H>,
  fn9: Operation<H, I>,
): Operation<T, I>;
export function pipe<T, A, B, C, D, E, F, G, H, I>(
  fn1: Operation<T, A>,
  fn2: Operation<A, B>,
  fn3: Operation<B, C>,
  fn4: Operation<C, D>,
  fn5: Operation<D, E>,
  fn6: Operation<E, F>,
  fn7: Operation<F, G>,
  fn8: Operation<G, H>,
  fn9: Operation<H, I>,
  ...fns: Operation<any, any>[]
): Operation<T, unknown>;
export function pipe(...fns: Array<Operation<any, any>>): Operation<any, any> {
  return pipeFromAsyncArray(fns);
}

/** A pipeline operation that does nothing */
export function skip<T>(): (value: T) => T {
  return (value) => value;
}

/** A pipeline explicitly for tag operations */
export function tagPipeline(...operations: (TagOperation | undefined)[]): TagOperation {
  return pipeFromAsyncArray(operations.filter((o) => !!o));
}

/** @internal */
export function pipeFromAsyncArray<T, R>(fns: Array<Operation<T, R>>): Operation<T, R> {
  if (fns.length === 0) return identity as Operation<any, any>;

  if (fns.length === 1) return fns[0];

  return async function piped(input: T, context: EventFactoryContext): Promise<R> {
    return fns.reduce(async (prev: any, fn: Operation<T, R>) => fn(await prev, context), input as any);
  };
}
