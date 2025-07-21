import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "ComponentMap",
        "ObservableResource",
        "identity",
        "pluckCurrentTargetChecked",
        "pluckCurrentTargetValue",
        "pluckFirst",
        "useAccountManager",
        "useAccounts",
        "useAction",
        "useActionHub",
        "useActiveAccount",
        "useEventFactory",
        "useEventModel",
        "useEventStore",
        "useForceUpdate",
        "useLayoutObservable",
        "useLayoutObservableState",
        "useLayoutSubscription",
        "useObservable",
        "useObservableCallback",
        "useObservableEagerMemo",
        "useObservableEagerState",
        "useObservableGetState",
        "useObservableMemo",
        "useObservablePickState",
        "useObservableRef",
        "useObservableState",
        "useObservableSuspense",
        "useRefFn",
        "useRenderNast",
        "useRenderThrow",
        "useRenderedContent",
        "useSubscription",
      ]
    `);
  });
});
