import { subscribeSpyTo } from "@hirez_io/observer-spy";
import { from, of } from "rxjs";
import { describe, expect, it } from "vitest";

import { FakeUser } from "../../__tests__/fixtures.js";
import { EventStore } from "../../event-store/event-store.js";
import { mapEventsToStore } from "../map-events-to-store.js";

const user = new FakeUser();

describe("mapEventsToStore", () => {
  it("should filte rout invalid events", () => {
    const store = new EventStore();
    store.verifyEvent = () => false;

    const spy = subscribeSpyTo(of(user.profile({ name: "testing" })).pipe(mapEventsToStore(store)), {
      expectErrors: true,
    });

    expect(spy.getValues()).toEqual([]);
  });

  it("should map events to the cononical event in the store", () => {
    const store = new EventStore();

    const event = user.profile({ name: "testing" });
    store.add(event);

    const spy = subscribeSpyTo(of({ ...event }).pipe(mapEventsToStore(store)));

    expect(spy.getValueAt(0)).toBe(event);
  });

  it("should remove duplicates if requested", () => {
    const store = new EventStore();

    const event = user.profile({ name: "testing" });
    const spy = subscribeSpyTo(
      from([event, { ...event }, { ...event }, { ...event }]).pipe(mapEventsToStore(store, true)),
    );

    expect(spy.getValuesLength()).toBe(1);
    expect(spy.getValueAt(0)).toBe(event);
  });

  it("should keep duplicates if requested", () => {
    const store = new EventStore();

    const event = user.profile({ name: "testing" });
    const spy = subscribeSpyTo(
      from([event, { ...event }, { ...event }, { ...event }]).pipe(mapEventsToStore(store, false)),
    );

    expect(spy.getValuesLength()).toBe(4);
    expect(spy.getValues()).toEqual([event, event, event, event]);
  });
});
