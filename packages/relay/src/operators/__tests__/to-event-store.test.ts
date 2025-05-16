import { EventStore } from "applesauce-core";
import { describe, expect, it } from "vitest";
import { FakeUser } from "../../__tests__/fake-user.js";
import { of } from "rxjs";
import { subscribeSpyTo } from "@hirez_io/observer-spy";
import { toEventStore } from "../to-event-store.js";

const user = new FakeUser();

describe("toEventStore", () => {
  it("should remove duplicate events", () => {
    const eventStore = new EventStore();

    const event = user.note("original content");

    const source = of(event, { ...event }, { ...event }, { ...event });
    const spy = subscribeSpyTo(source.pipe(toEventStore(eventStore)));

    expect(spy.getValuesLength()).toBe(1);
    expect(spy.getValueAt(0).length).toBe(1);
    expect(spy.getValueAt(0)[0]).toBe(event);
  });
});
