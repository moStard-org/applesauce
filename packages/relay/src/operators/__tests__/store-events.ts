import { subscribeSpyTo } from "@hirez_io/observer-spy";
import { EventStore } from "applesauce-core";
import { Subject } from "rxjs";
import { describe, expect, it } from "vitest";

import { FakeUser } from "../../__tests__/fake-user.js";
import { storeEvents } from "../store-events.js";

const user = new FakeUser();

describe("storeEvents", () => {
  it("should store events", () => {
    const eventStore = new EventStore();
    const source = new Subject<any>();
    const event = user.note("test content");

    const spy = subscribeSpyTo(source.pipe(storeEvents(eventStore)));
    source.next(event);

    expect(eventStore.events).toContain(event);
    expect(spy.getValuesLength()).toBe(1);
    expect(spy.getValueAt(0)).toBe(event);
  });

  it("should ignore strings", () => {
    const eventStore = new EventStore();
    const source = new Subject<any>();
    const event = "test string";

    const spy = subscribeSpyTo(source.pipe(storeEvents(eventStore)));
    source.next(event);

    expect(eventStore.events.length).toBe(0);
    expect(spy.getValuesLength()).toBe(1);
    expect(spy.getValueAt(0)).toBe(event);
  });
});
