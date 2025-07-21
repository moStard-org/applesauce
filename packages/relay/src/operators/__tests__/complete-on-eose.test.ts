import { describe, expect, it } from "vitest";
import { of } from "rxjs";
import { completeOnEose } from "../complete-on-eose.js";
import { SubscriptionResponse } from "../../types.js";
import { subscribeSpyTo } from "@hirez_io/observer-spy";

describe("completeOnEose", () => {
  it("should complete on EOSE", () => {
    const source = of<SubscriptionResponse>("EOSE");
    const spy = subscribeSpyTo(source.pipe(completeOnEose()));
    expect(spy.getValues()).toEqual([]);
    expect(spy.receivedComplete()).toBe(true);
  });

  it("should include EOSE if inclusive is true", () => {
    const source = of<SubscriptionResponse>("EOSE");
    const spy = subscribeSpyTo(source.pipe(completeOnEose(true)));
    expect(spy.getValues()).toEqual(["EOSE"]);
    expect(spy.receivedComplete()).toBe(true);
  });
});
