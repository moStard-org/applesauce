import { Filter, NostrEvent } from "nostr-tools";
import {
  filter,
  InteropObservable,
  Observable,
  OperatorFunction,
  share,
  Subject,
  SubjectLike,
  Subscribable,
} from "rxjs";

export type RelayFilterMap<T = Filter> = {
  [relay: string]: T[];
};

/**
 * A function that takes an array of filters and returns matching events
 * @todo this should support Promise<NostrEvent[]>
 */
export type CacheRequest = (filters: Filter[]) => Observable<NostrEvent>;

/** @deprecated request based loaders should expect EOSE to be handled by upstream applications */
export type NostrResponse = NostrEvent | "EOSE";

/** A function that takes a list of relays and filters and returns an observable of NostrEvents that completes when EOSE is received */
export type NostrRequest = (relays: string[], filters: Filter[], id?: string) => Observable<NostrResponse>;

/** Base interface for a loader pipeline` */
export interface Pipeline<Input, Output> {
  input: SubjectLike<Input>;
  output: Observable<Output>;
}

/** Creates a pipeline that takes an input and outputs the result of an operator */
export function createPipeline<Input extends unknown = unknown, Output extends unknown = unknown>(
  operator: OperatorFunction<Input, Output>,
): Pipeline<Input, Output> {
  const input = new Subject<Input>();
  const output = input.pipe(operator, share());

  return { input, output };
}

/** Returns an observable that emits a value into a pipeline on subscription */
export function triggerPipeline<Input, Output>(
  pipeline: Pipeline<Input, Output>,
  value: Input,
  matcher: (output: Output) => boolean,
): Observable<Output> {
  return new Observable<Output>((observer) => {
    // Add value to queue after subscribed
    setTimeout(() => pipeline.input.next(value), 0);

    // subscribe to the results
    return pipeline.output.pipe(filter(matcher)).subscribe(observer);
  });
}

/** Base interface for a loader */
export interface ILoader<Input, Output> extends Subscribable<Output>, Pipeline<Input, Output> {
  // Push a value into the loader pipeline
  next: (value: Input) => void;
  /** Pipe helper method from */
  pipe: Observable<Output>["pipe"];
}

/** Base loader class */
export class Loader<Input, Output> implements ILoader<Input, Output>, InteropObservable<Output> {
  input = new Subject<Input>();
  output: Observable<Output>;

  pipe: Observable<Output>["pipe"];
  subscribe: Observable<Output>["subscribe"];

  constructor(
    transform: OperatorFunction<Input, Output>,
    protected matcher?: (input: Input, output: Output) => boolean,
  ) {
    this.output = this.input.pipe(
      transform,
      // only create a single instance of the transformer
      share(),
    );

    // copy pipe function
    this.pipe = this.output.pipe.bind(this.output);
    this.subscribe = this.output.subscribe.bind(this.output);
  }

  /** Push a value into the pipeline */
  next(value: Input) {
    this.input.next(value);
  }

  /** Push a value into the pipeline and wait for the results */
  request(value: Input) {
    if (!this.matcher) throw new Error("Matcher is required");
    return triggerPipeline(this, value, (output) => this.matcher!(value, output));
  }

  [Symbol.observable]() {
    return this.output;
  }
}
