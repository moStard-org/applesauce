# Timeline Loader

The Timeline Loader is designed for fetching paginated Nostr events in chronological order. It maintains state between calls, allowing you to efficiently load timeline events in blocks until you reach a specific timestamp or exhaust available events.

:::warning
The observable returned by the Timeline Loader MUST be subscribed to in order for the request to be made. No request will be sent until you call `.subscribe()` on the returned observable.
:::

## Basic Usage

```ts
import { createTimelineLoader } from "applesauce-loaders/loaders";
import { RelayPool } from "applesauce-relay";

// Create a relay pool
const pool = new RelayPool();

// Create a timeline loader
const timelineLoader = createTimelineLoader(
  pool,
  ["wss://relay.example.com"],
  { kinds: [1] }, // Load text notes
);

// Initial load - gets the most recent events
timelineLoader().subscribe((event) => {
  console.log("Loaded event:", event);
});

// Later, load older events by calling the loader again
// Each call continues from where the previous one left off
timelineLoader().subscribe((event) => {
  console.log("Loaded older event:", event);
});

// Load events until a specific timestamp
const oneWeekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
timelineLoader(oneWeekAgo).subscribe((event) => {
  console.log("Event from last week:", event);
});
```

## Configuration Options

The `createTimelineLoader` function accepts these options:

- `limit`: Maximum number of events to request per filter
- `cache`: A method used to load events from a local cache
- `eventStore`: An event store to pass all events to

:::warning
If an event store is not provided, the loader will not be able to deduplicate events.
:::

## Working with Relay Pools

The Timeline Loader requires a request method for loading Nostr events from relays. You can provide this in multiple ways:

### Using a RelayPool instance

The simplest approach is to pass a RelayPool instance directly:

```ts
import { createTimelineLoader } from "applesauce-loaders/loaders";
import { RelayPool } from "applesauce-relay";
import { EventStore } from "applesauce-core";

const eventStore = new EventStore();
const pool = new RelayPool();

const timelineLoader = createTimelineLoader(
  pool,
  ["wss://relay.example.com"],
  { kinds: [1], authors: ["user_pubkey"] },
  { eventStore },
);
```

### Using a custom request method

You can also provide a custom request method, such as one from nostr-tools:

```ts
import { createTimelineLoader } from "applesauce-loaders/loaders";
import { SimplePool } from "nostr-tools";
import { Observable } from "rxjs";

const pool = SimplePool();

// Create a custom request function using nostr-tools
function customRequest(relays, filters) {
  return new Observable((observer) => {
    const sub = pool.subscribeMany(relays, filters, {
      onevent: (event) => observer.next(event),
      eose: () => observer.complete(),
    });

    return () => sub.close();
  });
}

// Create a function that matches the UpstreamPool interface
const customPool = {
  request: customRequest,
};

// Create timeline loader with custom pool
const timelineLoader = createTimelineLoader(customPool, ["wss://relay.example.com"], filters);
```

## Loading from cache

For improved performance, you can configure the loader to use a local cache:

```ts
import { createTimelineLoader } from "applesauce-loaders/loaders";
import { openDB, getEventsForFilters } from "nostr-idb";

// Setup a local event cache
const cache = await openDB();

function cacheRequest(filters) {
  return getEventsForFilters(cache, filters);
}

const timelineLoader = createTimelineLoader(
  pool,
  ["wss://relay.example.com"],
  { kinds: [1] },
  { cache: cacheRequest, eventStore },
);
```

## Real-World Example

Here's how you might use the Timeline Loader in a React application for an infinite scrolling feed:

```tsx
import { createTimelineLoader } from "applesauce-loaders/loaders";
import { RelayPool } from "applesauce-relay";
import { EventStore } from "applesauce-core";
import { useEffect, useState } from "react";

// Setup at app level
const eventStore = new EventStore();
const pool = new RelayPool();

function Feed() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timelineLoader, setTimelineLoader] = useState(null);

  // Initialize the timeline loader
  useEffect(() => {
    const loader = createTimelineLoader(
      pool,
      ["wss://relay.example.com"],
      { kinds: [1] }, // Load text notes
      { eventStore },
    );

    setTimelineLoader(() => loader);

    // Load initial events
    loadMoreEvents(loader);
  }, []);

  // Function to load more events
  const loadMoreEvents = (loader) => {
    if (!loader || loading) return;

    setLoading(true);

    const subscription = loader().subscribe({
      next: (event) => {
        setEvents((prev) => [...prev, event]);
      },
      complete: () => {
        setLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  };

  return (
    <div>
      {events.map((event) => (
        <div key={event.id} className="event">
          {event.content}
        </div>
      ))}

      <button onClick={() => loadMoreEvents(timelineLoader)} disabled={loading}>
        {loading ? "Loading..." : "Load More"}
      </button>
    </div>
  );
}
```

## Loading Sequence

The Timeline Loader follows this sequence when loading events:

1. Start with a cursor at Infinity (most recent events)
2. Attempt to load from cache (if configured)
3. Fetch from specified relays in parallel
4. Update the cursor to the oldest event's timestamp
5. Each subsequent call starts from the updated cursor
6. Stop when no more events are returned or the specified timestamp is reached

This stateful approach allows efficient pagination through chronological timelines with minimal code complexity.
