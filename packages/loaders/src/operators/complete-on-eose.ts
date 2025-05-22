import { Observable, OperatorFunction, takeWhile } from "rxjs";

/**
 * Completes the observable when an EOSE message is received
 * @deprecated request methods passed to loaders should complete on their own
 */
export function completeOnEOSE<T extends unknown>(): OperatorFunction<T | "EOSE", T> {
  return (source) => source.pipe(takeWhile((m) => m !== "EOSE", false)) as Observable<T>;
}
