import { filter, map, mergeAll, Observable, OperatorFunction, share, Subject, take } from "rxjs";

/** Creates a loader that takes a single value and batches the requests to an upstream loader */
export function createBatchLoader<Input extends unknown = unknown, Output extends unknown = unknown>(
  buffer: OperatorFunction<Input, Input[]>,
  upstream: (input: Input[]) => Observable<Output>,
  matcher: (input: Input, output: Output) => boolean,
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
        )
        .subscribe(observer);
    });
}
