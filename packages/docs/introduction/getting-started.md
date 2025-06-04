# Getting Started

There are a few main components that makeup the applesauce libraries: [Helpers](https://hzrd149.github.io/applesauce/typedoc/modules/applesauce-core.Helpers.html), the [EventStore](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-core.EventStore.html), and [Models](https://hzrd149.github.io/applesauce/typedoc/modules/applesauce-core.Models.html)

## Helpers

Helper methods are the core of the library and serve to extract and parse nostr events

A few good example methods are [getProfileContent](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-core.Helpers.getProfileContent.html) which returns the parsed content of a kind:0 event and [getOutboxes](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-core.Helpers.getOutboxes.html) which returns an array of outbox _(write)_ relays from a kind:10002 relay list event

## EventStore

The [EventStore](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-core.EventStore.html) class is an in-memory database that can be used to subscribe to events and timeline updates

The event store does not make any relay connections or fetch any data, nor does it persist the events. its sole purpose is to store events and notify the UI when there are new events

> [!NOTE]
> Its recommended that you only create a single instance of the `EventStore` for your app

## Models

Models are more complex subscriptions that can be run against the `EventStore`

For example the [ProfileModel](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-core.Models.ProfileModel.html) can be used to subscribe to changes to a users profile

```ts
const sub = queryStore
  .createQuery(ProfileModel, "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d")
  .subscribe((profile) => {
    if (profile) console.log(profile);
  });
```

Or the [MailboxesModel](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-core.Models.MailboxesModel.html) can be used to subscribe to changes to a users outbox and inbox relays

```ts
const sub = queryStore
  .createQuery(MailboxesModel, "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d")
  .subscribe((mailboxes) => {
    if (mailboxes) {
      console.log(mailboxes.inboxes, mailboxes.outboxes);
    }
  });
```

## Actions

Actions are reusable functions that perform specific operations on nostr events. The `applesauce-actions` package provides a collection of pre-built actions that can be used in your application.

Actions are typically executed in a [ActionHub](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-actions.ActionHub.html), which provides the `EventStore` and `EventFactory` to the actions.
