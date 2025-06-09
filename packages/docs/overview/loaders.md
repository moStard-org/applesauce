# Loaders

The `applesauce-loaders` package contains loaders built for common nostr event loading patterns.

## Installation

:::code-group

```sh [npm]
npm install applesauce-loaders
```

```sh [yarn]
yarn install applesauce-loaders
```

```sh [pnpm]
pnpm install applesauce-loaders
```

:::

## Event Loader

The [EventPointerLoader](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-loaders.EventPointerLoader.html) is a type of loader for loading events by their ids.

## Address Loader

The [AddressPointerLoader](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-loaders.AddressPointerLoader.html) is a type of loader for loading events by their address.

## Timeline Loader

The [TimelineLoader](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-loaders.TimelineLoader.html) is a type of loader used for loading paginated timelines of events.

## Tag Value Loader

The [TagValueLoader](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-loaders.TagValueLoader.html) is a type of loader used for loading sets of events with a specific tag values. (e.g. reactions, zaps, etc...)

```ts
import { tagValueLoader } from "applesauce-loaders";
```

### Common Features

All loaders support these common options:

- `bufferTime`: Time interval to buffer requests in ms (default 1000)
- `bufferSize`: Max buffer size (default 200)
- `eventStore`: An event store used to deduplicate events
- `cacheRequest`: A method used to load events from a local cache
- `extraRelays`: An array of relays to always fetch from

### Basic Usage

```ts
import { EventPointerLoader } from "applesauce-loaders/loaders";

const loader = eventPointerLoader(request, {
  bufferTime: 1000,
  bufferSize: 200,
  cacheRequest: cacheRequest,
  eventStore: eventStore,
});

// Subscribe to receive events
loader.subscribe((event) => {
  console.log(event);
});

// Request an event
loader.next({
  id: "event_id",
  relays: ["wss://relay.example.com"],
});
```

## Loading from Cache

Loaders support loading events from a local cache through the `cacheRequest` option. The cache request should return an Observable of events:

```ts
function cacheRequest(filters: Filter[]) {
  return new Observable(async (observer) => {
    const events = await cacheDatabase.getEventsForFilters(filters);

    for (const event of events) {
      observer.next(event);
    }
    observer.complete();
  });
}

const loader = eventPointerLoader(request, {
  cacheRequest: cacheRequest,
});
```

Events from cache are automatically marked using `markFromCache` from `applesauce-core`:

```ts
import { isFromCache } from "applesauce-core/helpers";

loader.subscribe((event) => {
  if (!isFromCache(event)) {
    // This is a new event from the network
    cacheDatabase.addEvent(event);
  }
});
```

## Timeline Loader

The TimelineLoader is designed for loading paginated timelines of events. It handles cursor-based pagination automatically:

```ts
import { timelineLoader } from "applesauce-loaders";

const timeline = createTimelineLoader(request, ["wss://relay.example.com"], [{ kinds: [1], limit: 50 }], {
  cache: cacheRequest,
  eventStore: eventStore,
  limit: 50,
});

// Start loading from the beginning
timeline().subscribe((event) => console.log(event));

// Load events since a timestamp
timeline(1234567890).subscribe((event) => console.log(event));
```

## Tag Value Loader

The TagValueLoader is specialized for loading events with specific tag values:

```ts
import { tagValueLoader } from "applesauce-loaders";

const loader = tagValueLoader(request, "e", {
  kinds: [1, 7], // Restrict to specific kinds
  authors: ["pubkey"], // Restrict to specific authors
  since: 1234567890, // Load events since timestamp
  cacheRequest: cacheRequest,
  eventStore: eventStore,
});

loader.next({
  value: "event_id",
  relays: ["wss://relay.example.com"],
});
```

## Address Loader

The AddressLoader handles loading replaceable events with support for relay hints and fallback lookups:

```ts
import { addressPointerLoader } from "applesauce-loaders";

const loader = addressPointerLoader(request, {
  followRelayHints: true,
  lookupRelays: ["wss://relay.example.com"],
  extraRelays: ["wss://fallback.example.com"],
});

loader.next({
  kind: 0,
  pubkey: "pubkey",
  identifier: "optional_d_tag",
  relays: ["wss://relay.example.com"],
});
```
