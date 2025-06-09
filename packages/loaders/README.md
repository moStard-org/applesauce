# applesauce-loaders

A collection of loader methods to make common event loading patterns easier.

## Address Pointer Loader

The `addressPointerLoader` is one of the two main loaders used to load events from relays. It can be used to load events based on their address (kind, pubkey, and optionally identifier for parameterized events).

```ts
import { Observable } from "rxjs";
import { EventStore } from "applesauce-core";
import { addressPointerLoader } from "applesauce-loaders/loaders";
import { RelayPool } from "applesauce-relay";

const eventStore = new EventStore();
const pool = new RelayPool();

// Create the address loader instance
const addressLoader = addressPointerLoader(pool, {
  // Pass all events to the event store to deduplicate them
  eventStore,
  // Optional configuration options
  bufferTime: 1000,
});

// Load a profile (kind 0)
addressLoader({
  kind: 0,
  pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  relays: ["wss://relay.example.com"],
}).subscribe((events) => {
  // Handle the loaded events
  console.log(events);
});

// Load a contact list (kind 3)
addressLoader({
  kind: 3,
  pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  relays: ["wss://relay.example.com"],
}).subscribe((events) => {
  // Handle the loaded events
  console.log(events);
});

// Load a parameterized replaceable event
addressLoader({
  kind: 30000,
  pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  identifier: "list of bad people",
  relays: ["wss://relay.example.com"],
}).subscribe((events) => {
  // Handle the loaded events
  console.log(events);
});
```

## Event Pointer Loader

The `eventPointerLoader` is the other main loader used to load events from relays. It can be used to load events based on their id.

```ts
import { eventPointerLoader } from "applesauce-loaders/loaders";

const eventLoader = eventPointerLoader(pool, {
  // Pass all events to the event store to deduplicate them
  eventStore,
  // Optional configuration options
  bufferTime: 1000,
});

eventLoader({
  id: "2650f6292166624f45795248edb9ca136c276a3d10a0d8f4efd2b8b23eb2d5fc",
}).subscribe((event) => {
  // Handle the loaded event
  console.log(event);
});

// Load from extra relays
eventLoader({
  id: "2650f6292166624f45795248edb9ca136c276a3d10a0d8f4efd2b8b23eb2d5fc",
  relays: ["wss://relay.example.com"],
}).subscribe((event) => {
  // Handle the loaded event
  console.log(event);
});
```

## Loading from cache

All loaders support a `cacheRequest` option to load events from a local cache.

```ts
import { NostrEvent, Filter } from "nostr-tools";
import { eventPointerLoader } from "applesauce-loaders/loaders";

// Custom method for loading events from a database
async function cacheRequest(filters: Filter[]): Promise<NostrEvent[]> {
  return await cacheDatabase.getEvents(filters);
}

const eventLoader = eventPointerLoader(pool, {
  // Pass all events to the event store to deduplicate them
  eventStore,
  // Pass a custom cache method
  cacheRequest,
  // Optional configuration options
  bufferTime: 1000,
});

// Because no relays are specified, the event will be loaded from the cache
eventLoader({
  id: "2650f6292166624f45795248edb9ca136c276a3d10a0d8f4efd2b8b23eb2d5fc",
}).subscribe((event) => {
  // Handle the loaded event
  console.log(event);
});
```

## Other Available Loaders

The package also includes several other specialized loaders:

- `timelineLoader`: For loading events in a batched timeline
- `eventPointerLoader`: For loading specific events by id
- `socialGraphLoader`: For loading social graphs by traversing contact lists

Example using the social graph loader:

```ts
import { socialGraphLoader, addressPointerLoader } from "applesauce-loaders/loaders";

const addressLoader = addressPointerLoader(pool, { eventStore });
const graphLoader = socialGraphLoader(addressLoader, {
  eventStore,
  relays: ["wss://relay.example.com"],
  hints: false, // whether to follow relay hints in contact events
});

// Load social graph starting from a pubkey with distance 1
graphLoader({
  pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  distance: 1,
}).subscribe((event) => {
  // Handle each contact list event as it's loaded
  console.log(event);
});
```

Each loader is designed to handle specific use cases efficiently while providing a consistent interface for event loading across the application.
