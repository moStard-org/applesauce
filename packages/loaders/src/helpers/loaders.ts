import {
  filter,
  identity,
  isObservable,
  map,
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

/** Creates a loader that takes a single value and batches the requests to an upstream loader */
export function batchLoader<Input extends unknown = unknown, Output extends unknown = unknown>(
  buffer: OperatorFunction<Input, Input[]>,
  upstream: (input: Input[]) => Observable<Output>,
  matcher: (input: Input, output: Output) => boolean,
  output?: MonoTypeOperatorFunction<Output>,
): (value: Input) => Observable<Output> {
  const queue = new Subject<Input>();

  const requests = queue.pipe(
    buffer,
    // ignore empty buffers
    filter((buffer) => buffer.length > 0),
    // create a new upstream request for each buffer and make sure only one is created
    map((v) => upstream(v).pipe(share())),
    // Make sure that only a single upstream buffer is created
    share(),
  );

  return (input: Input) =>
    new Observable((observer) => {
      // Add the pointer to the queue when observable is subscribed
      setTimeout(() => queue.next(input), 0);

      return requests
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
