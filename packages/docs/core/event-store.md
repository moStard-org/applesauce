# Managing events

The `EventStore` is a reactive in-memory event database

At its core the event store uses the [`Database`](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-core.Database.html) class to store and index events

## Creating an event store

```ts
import { EventStore } from "applesauce-core";

const eventStore = new EventStore();
```

> [!INFO]
> Its recommended to only create a single event store for your app

## Adding events

To add events to the event store you can use the [`eventStore.add`](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-core.EventStore.html#add) method

Adding events to the event store will update any subscriptions that match that event

```ts
eventStore.timeline({kinds: [1]}).subscribe(events => {
  console.log(`timeline updated (${events.length})`)
})

const event = { kind: 1, ... }
eventStore.add(event)
```

### Duplicate an replaceable events

The event store understands to to handle replaceable (`1xxxx`) and parameterized replaceable events (`3xxxx`)

If the event store already has the event (same `id`) or if its a replaceable event and it already has newer version of it. `eventStore.add` will returning the **existing** instance of the event

This allows you to easily deduplicate events from multiple relays

```ts
const incoming = [
  {
    id: "f177c37f...",
    kind: 1,
    content: "",
    pubkey: "c3ae4ad8...",
    created_at: 1733345284,
    tags: [],
    sig: "...",
  },
  {
    id: "efd33141...",
    kind: 1,
    content: "",
    pubkey: "20d29810...",
    created_at: 1733343882,
    tags: [],
    sig: "...",
  },
  // duplicate of #1
  {
    id: "f177c37f...",
    kind: 1,
    content: "",
    pubkey: "c3ae4ad8...",
    created_at: 1733345284,
    tags: [],
    sig: "...",
  },
];

const sub = eventStore.stream({ kinds: [1] }).subscribe((event) => {
  console.log("new event", event);
});

// add first event
eventStore.add(incoming[0]);

// add second event
eventStore.add(incoming[1]);

// add duplicate event
const event = eventStore.add(incoming[2]);

// since the event f177c37f has already been added
// the subscription will not update and the returned event is the original
console.log(event !== incoming[2]);
```

## Subscribing

Subscriptions are rxjs [observables](https://rxjs.dev/guide/observable) that update when new events are added to the event store

### Single events

Subscribing to a single event will notify you when the event has been added to the event store or when it is deleted

```ts
const event = {
  content: "Hashtags are useless.",
  created_at: 1733153425,
  id: "000021ba6f5f4da9d1f913c73dcf8fc8347052b4e74e14a2e41101c0f40792c8",
  kind: 1,
  pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  sig: "6f197e399d1ebae054fbc20570fc8ef113a79afaa6057125170ba81afcecea2449969c9d1dbc61ff50328cae7166e9981734ba29672d9ae45acb675ff45ebd84",
  tags: [["nonce", "8002", "16"]],
};

const sub = eventStore.event("000021ba6f5f4da9d1f913c73dcf8fc8347052b4e74e14a2e41101c0f40792c8").subscribe((event) => {
  // value maybe undefined when the event is not in the event store
  // or if it has been deleted
  if (event) {
    console.log("event has been found", event);
  }
});

eventStore.add(event);
```

### Replaceable events

Subscribing to a replaceable event will notify you when there is a newer version or when it is deleted

```ts
const original = {
  id: "7607adc3934f368bf1a00cb1023e455707a90af94a29c2acf877dffb0ec4c0cb",
  pubkey: "d8dd41ef1e287dfc668d2473fbef8fa9deea5c2ef03947105ef568e68827e7e4",
  created_at: 1733346633,
  kind: 0,
  tags: [],
  content: '{ "name": "john" }',
  sig: "b706636043a64c5d1a07cabf66db08b1374d6efa4558e8832f5b90becb5cba190215a2ec1303e11dac494977801600b012959daa7145fba6d96ae3fcb629759e",
};

const updated = {
  id: "2f54a4491a31451cbe0d296297649af458d89df2f24d7f86d2474fd0607e29a1",
  pubkey: "d8dd41ef1e287dfc668d2473fbef8fa9deea5c2ef03947105ef568e68827e7e4",
  created_at: 1733346633,
  kind: 0,
  tags: [],
  content: '{ "name": "john smith" }',
  sig: "d66ecc0fb2b9170818defb593150563061716bce82d276d07b4b68be9ab542b2d14bb1335eb62971a84be5f315ecf32bdf53000e780a20330f63d7803a1fd95c",
};

eventStore.add(original);

// get the original and listen for any updates
const sub = eventStore
  .replaceable(0, "d8dd41ef1e287dfc668d2473fbef8fa9deea5c2ef03947105ef568e68827e7e4")
  .subscribe((event) => {
    // first event will be the original
    if (event) console.log("Profile Updated", event);
  });

// this will trigger the subscription
eventStore.add(updated);
```

### Streams

A stream subscription takes a filter(s) and returns all events that match and notifies you when there are new events

```ts
const sub = eventStore.stream({ kinds: [1] }).subscribe((event) => {
  console.log("Found text note", event);
});

// or if you only want to subscribe to future events
const sub = eventStore.stream({ kinds: [1] }, true).subscribe((event) => {
  console.log("Found new text note", event);
});
```

### Timelines

A timeline subscription takes a filter(s) and returns a sorted array of events that match the filter(s)

```ts
const timeline = eventStore.timeline({ kinds: [1] }).subscribe((events) => {
  console.log(events);
});

// fetch some events using another library
fetchEvents({ kinds: [1, 0] }, (event) => {
  // timeline will update for each new event
  eventStore.add(event);
});
```

## Static Methods

The event store provides several methods to directly access events without creating subscriptions. These methods are useful when you need to check for or retrieve events synchronously.

### Event Management

- `add(event)`: Add a new event to the store
- `remove(event)`: Remove an event from the store
- `update(event)`: Notify the store that an event has been updated

### Checking Event Existence

- `hasEvent(id)`: Check if an event with a specific ID exists in the store
- `hasReplaceable(kind, pubkey, identifier?)`: Check if a replaceable event exists for the given kind and pubkey combination

### Retrieving Events

- `getEvent(id)`: Get a single event by its ID
- `getReplaceable(kind, pubkey, identifier?)`: Get the latest version of a replaceable event
- `getReplaceableHistory(kind, pubkey, identifier?)`: Get the history of all versions of a replaceable event
- `getByFilters(filters)`: Get a set of all events that match the given filter(s)
- `getTimeline(filters)`: Get a sorted array of events that match the given filter(s)

Example usage:

```ts
// Check if an event exists
const exists = eventStore.hasEvent("000021ba6f5f...");

// Get an event by ID
const event = eventStore.getEvent("000021ba6f5f...");

// Get events matching filters
const events = eventStore.getByFilters({ kinds: [1], authors: ["000021ba6f5f..."] });

// Get a timeline of events
const timeline = eventStore.getTimeline({ kinds: [1] });

// Check and get replaceable events
const hasProfile = eventStore.hasReplaceable(0, "000021ba6f5f...");
const profile = eventStore.getReplaceable(0, "000021ba6f5f...");
```
