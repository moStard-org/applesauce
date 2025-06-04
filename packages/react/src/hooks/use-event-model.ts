import { ModelConstructor, withImmediateValueOrDefault } from "applesauce-core";
import { useObservableEagerState } from "observable-hooks";
import { useMemo } from "react";
import { of } from "rxjs";

import { useEventStore } from "./use-event-store.js";

/** Runs and subscribes to a model on the event store */
export function useEventModel<T extends unknown, Args extends Array<any>>(
  factory: ModelConstructor<T, Args>,
  args?: Args | null,
): T | undefined {
  const store = useEventStore();
  const observable$ = useMemo(() => {
    if (args) return store.model(factory, ...args).pipe(withImmediateValueOrDefault(undefined));
    else return of(undefined);
  }, [args, store]);

  return useObservableEagerState(observable$);
}
