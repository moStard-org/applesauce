import {
  filter,
  identity,
  isObservable,
  mergeAll,
  MonoTypeOperatorFunction,
  Observable,
  OperatorFunction,
  share,
  Subject,
  switchMap,
  take,
} from "rxjs";

/** Takes a value optionally wrapped in an observable and unwraps it */
export function unwrap<T, R>(value: T | Observable<T>, next: (value: T) => Observable<R>): Observable<R> {
  return isObservable(value) ? value.pipe(take(1), switchMap(next)) : next(value);
}

/**
 * Creates a loader that takes a single value and batches the requests to an upstream loader
 * IMPORTANT: the buffer operator MUST NOT filter values. its important that every input creates a new upstream request
 */
export function batchLoader<Input extends unknown = unknown, Output extends unknown = unknown>(
  buffer: OperatorFunction<Input, Input[]>,
  upstream: (input: Input[]) => Observable<Output>,
  matcher: (input: Input, output: Output) => boolean,
  output?: MonoTypeOperatorFunction<Output>,
): (value: Input) => Observable<Output> {
  const queue = new Subject<Input>();
  const next = new Subject<Observable<Output>>();

  // Every "buffer" make a new upstream request
  queue.pipe(buffer).subscribe((buffer) => {
    // If there is nothing in the buffer, dont make a request
    if (buffer.length === 0) return;

    return next.next(
      upstream(buffer).pipe(
        // Never reset the upstream request
        share({ resetOnRefCountZero: false, resetOnComplete: false, resetOnError: false }),
      ),
    );
  });

  return (input: Input) =>
    new Observable((observer) => {
      // Add the pointer to the queue when observable is subscribed
      // NOTE: do not use setTimeout here, FF has a strange bug where it will delay the queue.next until after the buffer
      /*
      Adding the value to the queue before the request subscribes to the next batch may cause it to miss the next batch
      but it should work the majority of the time because buffers use setTimeout internally which always runs next tick
      */
      queue.next(input);

      return next
        .pipe(
          // wait for the next batch to run
          take(1),
          // subscribe to it
          mergeAll(),
          // filter the results for the requested input
          filter((output) => matcher(input, output)),
          // Extra output operations
          output ?? identity,
        )
        .subscribe(observer);
    });
}
