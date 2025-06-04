# Models

The [`QueryStore`](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-core.QueryStore.html) class wraps the `EventStore` and allows you to subscribe to computed state in the form on [Queries](https://hzrd149.github.io/applesauce/typedoc/modules/applesauce-core.Queries.html)

The role of the query store is to keep track of all queries, wrap them in the rxjs [`share`](https://rxjs.dev/api/index/function/share) operator and ensure only one instance of each is created

> [!IMPORTANT]
> For performance reasons UI components should only subscribe to the `QueryStore` and NOT the `EventStore`

## Creating a query store

```ts
import { EventStore, QueryStore } from "applesauce-core";

const eventStore = new EventStore();

// the query store takes the upstream event store as the first argument
const queryStore = new QueryStore(eventStore);
```

## Running a query

The [`queryStore.createQuery`](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-core.QueryStore.html#createQuery) can be used to create and register a query in the query store

Queries are not started until the they are subscribe to. and they are destroyed when all subscriptions are closed

```ts
// The first argument is the query constructor and the remaining are passed to the query
const observable = queryStore.createQuery(TimelineQuery, [{ kinds: [1] }]);

// start the query by subscribing to it
observable.subscribe((events) => {
  console.log(events);
});

// adding events to the event store will update the timeline query
eventStore.add({kind: 1, content: 'new note', ...})
```

## Performance

The query store keeps track of what queries have been created and will ensure that only a single instance is created

```ts
const notes = queryStore.createQuery(TimelineQuery, [{ kinds: [1] }]);

// lots of code...

const otherTimeline = queryStore.createQuery(TimelineQuery, [{ kinds: [1] }]);

// because the query with the same arguments was created before
// the second call will return the same observable
console.log(otherTimeline === notes);

// this will create a new query because the filter is different
const files = queryStore.createQuery(TimelineQuery, [{ kinds: [1063] }]);
```

## Prebuilt queries

There a some useful pre-built queries that come with `applesauce-core`

- [`ReplaceableQuery`](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-core.Queries.ReplaceableQuery.html) subscribes to the latest version of a replaceable event.
- [`TimelineQuery`](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-core.Queries.TimelineQuery.html) subscribes to a sorted array of events that match filters.
- [`ProfileQuery`](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-core.Queries.ProfileQuery.html) subscribes to a single pubkey's profile (kind 0).
- [`ContactsQuery`](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-core.Queries.ContactsQuery.html) subscribes to a pubkeys contact list.
- [`MailboxesQuery`](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-core.Queries.MailboxesQuery.html) subscribes to a single pubkey's mailboxes (kind 10002).
- [`ReactionsQuery`](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-core.Queries.ReactionsQuery.html) subscribes to all [NIP-25](https://github.com/nostr-protocol/nips/blob/master/25.md) reactions to an event.

## Custom Queries

A custom query is simply a function that returns a [`Query`](https://hzrd149.github.io/applesauce/typedoc/types/applesauce-core.Query.html) object

For example here is a custom query that will subscribe to and parse a [NIP-78](https://github.com/nostr-protocol/nips/blob/master/78.md) app event that contains json

```ts
import { map } from "rxjs/operators";

function AppSettingsQuery<T>(pubkey: string): Query<T> {
  return (eventStore) =>
    eventStore.replaceable(30078, pubkey, "app-settings").pipe(
      map((event) => {
        if (!event) return undefined;
        return JSON.parse(event.content) as T;
      }),
    );
}

const sub = queryStore
  .createQuery(AppSettingsQuery, "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d")
  .subscribe((json) => {
    // json will either be undefined or { theme: string }
    if (json) console.log("updated data", json);
  });

eventStore.add({
  kind: 30078,
  content: '{"theme": "dark"}',
  // rest of event
});
```
