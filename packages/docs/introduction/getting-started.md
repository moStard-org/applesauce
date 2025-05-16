# Getting Started

There are a few main components that makeup the applesauce libraries: [Helpers](https://hzrd149.github.io/applesauce/typedoc/modules/applesauce-core.Helpers.html), the [EventStore](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-core.EventStore.html), the [QueryStore](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-core.QueryStore.html), and [Queries](https://hzrd149.github.io/applesauce/typedoc/modules/applesauce-core.Queries.html)

## Helpers

Helper methods are the core of the library and serve to extract and parse nostr events

A few good example methods are [getProfileContent](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-core.Helpers.getProfileContent.html) which returns the parsed content of a kind:0 event and [getOutboxes](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-core.Helpers.getOutboxes.html) which returns an array of outbox _(write)_ relays from a kind:10002 relay list event

## EventStore

The [EventStore](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-core.EventStore.html) class is an in-memory database that can be used to subscribe to events and timeline updates

The event store does not make any relay connections or fetch any data, nor does it persist the events. its sole purpose is to store events and notify the UI when there are new events

> [!NOTE]
> Its recommended that you only create a single instance of the `EventStore` for your app

## QueryStore

The `QueryStore` is built on top of the `EventStore` and handles managing and running the queries. its primary role is to ensure that only a single query for each filter is created and that it is wrapped in the rxjs [share](https://rxjs.dev/api/index/function/share) operator for performance reasons

> [!IMPORTANT]
> For performance reasons UI components should only subscribe to the `QueryStore` and NOT the `EventStore`

## Queries

Queries are more complex subscriptions that can be run against the `QueryStore`

For example the [ProfileQuery](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-core.Queries.ProfileQuery.html) query can be used to subscribe to changes to a users profile

```ts
const sub = queryStore
  .createQuery(ProfileQuery, "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d")
  .subscribe((profile) => {
    if (profile) console.log(profile);
  });
```

Or the [MailboxesQuery](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-core.Queries.MailboxesQuery.html) can be used to subscribe to changes to a users outbox and inbox relays

```ts
const sub = queryStore
  .createQuery(MailboxesQuery, "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d")
  .subscribe((mailboxes) => {
    if (mailboxes) {
      console.log(mailboxes.inboxes, mailboxes.outboxes);
    }
  });
```

## Actions

Actions are reusable functions that perform specific operations on nostr events. The `applesauce-actions` package provides a collection of pre-built actions that can be used in your application.

Actions are typically executed in a [ActionHub](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-actions.ActionHub.html), which provides the `EventStore` and `EventFactory` to the actions.
