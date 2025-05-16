# applesauce-core

AppleSauce is a collection of utilities for building reactive nostr applications. The core package provides an in-memory event database and reactive queries to help you build nostr UIs with less code.

## Key Components

- **Helpers**: Core utility methods for parsing and extracting data from nostr events
- **EventStore**: In-memory database for storing and subscribing to nostr events
- **QueryStore**: Manages queries and ensures efficient subscription handling
- **Queries**: Complex subscriptions for common nostr data patterns

## Documentation

For detailed documentation and guides, visit:

- [Getting Started](https://hzrd149.github.io/applesauce/introduction/getting-started)
- [API Reference](https://hzrd149.github.io/applesauce/typedoc/)

## Example

```js
import { EventStore, QueryStore } from "applesauce-core";
import { Relay } from "nostr-tools/relay";

// Create a single EventStore instance for your app
const eventStore = new EventStore();

// Create a QueryStore to manage subscriptions efficiently
const queryStore = new QueryStore(eventStore);

// Use any nostr library for relay connections (nostr-tools, ndk, nostrify, etc...)
const relay = await Relay.connect("wss://relay.example.com");

// Subscribe to events and add them to the store
const sub = relay.subscribe([{ authors: ["3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"] }], {
  onevent(event) {
    eventStore.add(event);
  },
});

// Subscribe to profile changes using ProfileQuery
const profile = queryStore.createQuery(
  ProfileQuery,
  "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
);

profile.subscribe((parsed) => {
  if (parsed) console.log(parsed);
});

// Subscribe to a timeline of events
const timeline = queryStore.createQuery(TimelineQuery, { kinds: [1] });

timeline.subscribe((events) => {
  console.log(events);
});
```
