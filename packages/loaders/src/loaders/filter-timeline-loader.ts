import { unixNow } from "applesauce-core/helpers";
import { Filter, NostrEvent } from "nostr-tools";
import { Observable, takeWhile } from "rxjs";

import { concatGeneratorMap } from "../operators/generator.js";
import { createPipeline, triggerPipeline } from "./loader.js";
import { TimelessFilter } from "./relay-timeline-loader.js";

export type RelayTimelineLoaderOptions = {
  /** default number of events to request in each batch */
  limit?: number;
};

/** A loader that loads all events between a since and until timestamp */
// function createBlockLoader(request: (filters: Filter[]) => Observable<NostrEvent>) {
//   return wrapGeneratorFunction(function* (opts: {
//     filters: TimelessFilter[];
//     since: number;
//     until: number;
//     limit?: number;
//   }): Generator<Observable<NostrEvent>, void, NostrEvent[]> {
//     let cursor = opts.until;

//     // Keep loading blocks until none are returned or an event is found that is ealier then the new cursor
//     while (cursor > opts.since) {
//       const filters = opts.filters.map((filter) => ({
//         limit: filter.limit || opts.limit,
//         ...filter,
//         until: cursor,
//       }));

//       // Load the next block of events
//       const results = yield request(filters);

//       // Update the cursor to the oldest event
//       cursor = Math.min(results[0].created_at - 1, cursor);

//       // Set the loader to complete if no events are returned
//       if (results.length === 0) return;
//     }
//   });
// }

// /** Wraps a function and makes all its calls sequencial */
// function sequencial<Args extends unknown[], Return>(
//   fn: (...args: Args) => Observable<Return>,
// ): (...args: Args) => Observable<Return> {
//   let last: Observable<Return> | undefined;

//   return (...args: Args) => {
//     // Return a new observable that waits for the last call to complete before subscribing to the next
//     const observable = new Observable<Return>((observer) => {
//       let sub: Subscription;

//       if (last)
//         sub = last.subscribe({
//           complete: () => {
//             last = observable;
//             sub = fn(...args)
//               .pipe(finalize(() => (last = undefined)))
//               .subscribe(observer);
//           },
//         });
//       else {
//         last = observable;
//         sub = fn(...args)
//           .pipe(finalize(() => (last = undefined)))
//           .subscribe(observer);
//       }

//       return () => sub.unsubscribe();
//     });

//     return observable;
//   };
// }

// function filterTimelineLoader(
//   filters: TimelessFilter[],
//   request: (filters: Filter[]) => Observable<NostrEvent>,
//   opts: { limit?: number },
// ) {
//   let cursor = Infinity;
//   let complete = false;

//   const loadBlock = createBlockLoader(request);
//   return sequencial((newCursor: number) => loadBlock({ filters, since: newCursor, until: cursor, limit: opts.limit }));
// }

export function createFilterTimelineLoader(
  filters: TimelessFilter[],
  request: (filters: Filter[]) => Observable<NostrEvent>,
  limit?: number,
) {
  let cursor = Infinity;
  let complete = false;

  const pipeline = createPipeline<number, NostrEvent>((source) =>
    source.pipe(
      // Complete if the cursor is not ealier than the current cursor
      takeWhile((newCursor) => newCursor < cursor),
      // Load the next blocks one at a time
      concatGeneratorMap<number, NostrEvent>(function* (newCursor) {
        if (newCursor < cursor) return;

        // Keep loading blocks until complete or an event is found that is ealier then the new cursor
        while (!complete && cursor > newCursor) {
          // Load the next block of events
          const results = yield request(
            filters.map((filter) => ({
              limit: filter.limit || limit,
              ...filter,
              // limit curser to now
              until: Math.min(unixNow(), cursor),
            })),
          );

          // Update the cursor to the oldest event
          cursor = Math.min(results[0].created_at - 1, cursor);

          // Set the loader to complete if no events are returned
          if (results.length === 0) complete = true;
        }
      }),
    ),
  );

  // Return a function to trigger another page load
  return (cursor?: number) =>
    triggerPipeline(pipeline, cursor ?? 0, (event) => cursor === undefined || event.created_at < cursor);
}
