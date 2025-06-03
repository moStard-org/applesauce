# Loaders

The `applesauce-loaders` package contains loader classes built on top of [rx-nostr](https://github.com/penpenpng/rx-nostr) that can be used to setup common event loading patterns

## Event Loader pattern

All the event loaders follow the same pattern, you create a loader and pass a request method into them along with options and get a request method back that can be used to load events.

```ts
import { addressPointerLoader } from "applesauce-loaders/loaders";

// Request method MUST return an observable of events that completes when EOSE is received
function request(relays: string[], filters: Filter[]): Observable<NostrEvent> {
  return new Observable((observer) => {});
}

// create a loader for fetching replaceable events (profiles, lists, etc)
const addressLoader = addressPointerLoader(request, {
  // Options
});
```

Once the loader is created it can be used to request events

```ts
// returned value is a rxjs Subscription
const sub = addressLoader({ pubkey: "pubkey", kind: 0 }).subscribe((event) => {
  console.log(event);
});

// cancel the request
sub.unsubscribe();
```

## Loading from cache

Most of the loaders class can take a [cacheRequest](https://hzrd149.github.io/applesauce/typedoc/types/applesauce-loaders.CacheRequest.html) method that can be used to load events from a local cache. the method should return an rxjs `Observable<NostrEvent>` that completes

```js
function cacheRequest(filters: Filter[]) {
  // Return an observable to stream the results
  return new Observable(async (observer) => {
    const events = await cacheDatabase.getEventsForFilters(filters)

    for(let event of events){
      observer.next(event)
    }
    observer.complete()
  });
}

const replaceableLoader = new ReplaceableLoader(rxNostr, {
  cacheRequest: cacheRequest,
});
```

Additionally the loaders will use the `markFromCache` method from `applesauce-core` to mark the events as being from the cache, so you can safely add new events to the cache without creating a infinite loop

```js
import { isFromCache } from "applesauce-core/helpers";

const replaceableLoader = new ReplaceableLoader(rxNostr, {
  cacheRequest: cacheRequest,
});

replaceableLoader.subscribe((packet) => {
  if (!isFromCache(packet.event)) {
    // this is a new event, so add it to the cache
    cacheDatabase.addEvent(packet.event);
  }
});
```

## Replaceable loader

The `ReplaceableLoader` class can be used to load any replaceable event from any relay

```js
import { EventStore } from "applesauce-core";
import { ReplaceableLoader } from "applesauce-loaders/loaders";
import { createRxNostr, nip07Signer } from "rx-nostr";
import { verifier } from "rx-nostr-crypto";

export const eventStore = new EventStore();
export const rxNostr = createRxNostr({
  verifier,
  signer: nip07Signer(),
  connectionStrategy: "lazy-keep",
});

const replaceableLoader = new ReplaceableLoader(rxNostr, {
  // lookup relays are used as a fallback if the event cant be found
  lookupRelays: ["wss://purplepag.es/"],
});
```

Next to start the loader and subscribe to the relays you can call `.subscribe`

```js
replaceableLoader.subscribe((packet) => {
  // send all loaded events to the event store
  eventStore.add(packet.event, packet.from);
});
```

Once the loader has been started you can call `.next` to request the event

```js
// request a replaceable event from the loader
replaceableLoader.next({
  kind: 0,
  pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  relays: ["wss://pyramid.fiatjaf.com/"],
});

// load a parameterized replaceable event
replaceableLoader.next({
  kind: 30000,
  pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  identifier: "list of bad people",
  relays: ["wss://pyramid.fiatjaf.com/"],
});

// if no relays are provided only the cache and lookup relays will be checked
replaceableLoader.next({
  kind: 3,
  pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
});

// passing a new relay will cause it to be loaded again
replaceableLoader.next({
  kind: 0,
  pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  relays: ["wss://relay.westernbtc.com/"],
});

// or force it to load it again from the same relays
replaceableLoader.next({
  kind: 0,
  pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  relays: ["wss://pyramid.fiatjaf.com/"],
  force: true,
});
```

### Batching

The replaceable loader class batches deduplicates requests under the hood, so there is no need to worry about spamming or requesting an event multiple times

```js
const replaceableLoader = new ReplaceableLoader(rxNostr);

// Only one request will be sent to the relay
for(let i = 0; i < 100: i++){
  replaceableLoader.next({
    kind: 0,
    pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    relays: ["wss://pyramid.fiatjaf.com/"],
  })
}
```

## Timeline loader

The [TimelineLoader](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-loaders.TimelineLoader.html) class should be used to load any more than 500 events

```js
import { TimelineLoader } from "applesauce-loaders";

const repliesTimeline = new TimelineLoader(
  rxNostr,
  // create a simple request map. use the same filter for both relays
  TimelineLoader.simpleFilterMap(
    ["wss://pyramid.fiatjaf.com/", "wss://relay.example.com/"],
    [{ kinds: [1], "#e": ["0000d5f3364a65771487f2c0705e35e70d215a7c6d204a1ccb859011803d8010"] }],
  ),
);

// start the loader by subscribing to it
repliesTimeline.subscribe((packet) => {
  eventStore.add(packet.event, packet.from);
});

// load the first page
repliesTimeline.next();

setTimeout(() => {
  // load next page after 10s
  repliesTimeline.next();
}, 10_000);
```

## Single event loader

The [SingleEventLoader](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-loaders.SingleEventLoader.html) class can be used to batch load individual events. its useful for loading parent replies and quoted events

```js
import { SingleEventLoader } from "applesauce-loaders";

const eventLoader = new SingleEventLoader(rxNostr);

// start the loader by subscribing to it
eventLoader.subscribe((packet) => {
  eventStore.add(packet.event, packet.from);
});

// request an event
eventLoader.next({
  id: "0000d5f3364a65771487f2c0705e35e70d215a7c6d204a1ccb859011803d8010",
  relays: ["wss://pyramid.fiatjaf.com/", "wss://nostr.wine/", "wss://nos.lol/"],
});
```

## Tag value loader

The [TagValueLoader](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-loaders.TagValueLoader.html) class can be used to load batches of events with an indexable set to a certain value

This can be used to load zaps, reactions, wiki pages, etc

```js
import { TagValueLoader } from "applesauce-loaders";

// Create a loader that loads all zap kinds with an #e tag
const zapsLoader = new TagValueLoader(rxNostr, "e", { name: "zaps", kinds: [kinds.Zap] });

// start the loader
zapsLoader.subscribe((packet) => {
  eventStore.add(packet.event, packet.from);
});

// request all zap events with #e tag === 0000d5f3364a65771487f2c0705e35e70d215a7c6d204a1ccb859011803d8010 from relays
eventLoader.next({
  value: "0000d5f3364a65771487f2c0705e35e70d215a7c6d204a1ccb859011803d8010",
  relays: ["wss://pyramid.fiatjaf.com/", "wss://nostr.wine/", "wss://nos.lol/"],
});
```
