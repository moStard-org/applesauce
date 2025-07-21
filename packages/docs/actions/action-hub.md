# Action Hub

The [ActionHub](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-actions.ActionHub.html) class is the central orchestrator for running actions in your Nostr application. It combines an event store, event factory, and optional publish method into a unified interface, making it simple to execute actions that read from your local event store and publish new events to the Nostr network.

## Creating an Action Hub

### Basic Setup

To create an ActionHub, you need an event store and event factory. Optionally, you can provide a publish method to automatically handle event publishing.

```ts
import { ActionHub } from "applesauce-actions";
import { NostrEvent } from "nostr-tools";

// Create a basic ActionHub without automatic publishing
const hub = new ActionHub(eventStore, eventFactory);

// Or create one with automatic publishing
const publish = async (event: NostrEvent) => {
  console.log("Publishing event:", event.kind);
  await relayPool.publish(event, defaultRelays);
};

const hub = new ActionHub(eventStore, eventFactory, publish);
```

### With Custom Publishing Logic

You can provide sophisticated publishing logic when creating your ActionHub:

```ts
const publish = async (event: NostrEvent) => {
  // Log the event
  console.log("Publishing", event);

  // Publish to relays
  await app.relayPool.publish(event, app.defaultRelays);

  // Save to local backup
  await localBackup.save(event);

  // Notify UI of new event
  eventBus.emit("eventPublished", event);
};

const hub = new ActionHub(eventStore, eventFactory, publish);
```

:::info
For performance reasons, it's recommended to create only one `ActionHub` instance for your entire application and reuse it across all action executions.
:::

## Configuration Options

### Save to Store

By default, the ActionHub will automatically save all events created by actions to your event store. You can disable this behavior:

```ts
const hub = new ActionHub(eventStore, eventFactory, publish);
hub.saveToStore = false; // Disable automatic saving to event store
```

## Running Actions

The ActionHub provides two primary methods for executing actions: `.run()` for fire-and-forget execution with automatic publishing, and `.exec()` for fine-grained control over event handling.

### Using `.run()` - Automatic Publishing

The [ActionHub.run](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-actions.ActionHub.html#run) method executes an action and automatically publishes all generated events using the publish method provided during ActionHub creation.

:::warning
`ActionHub.run()` will throw an error if no `publish` method was provided when creating the ActionHub.
:::

```ts
import { FollowUser, NewContacts } from "applesauce-actions/actions";

// Create a new contact list (throws if one already exists)
try {
  await hub.run(NewContacts);
  console.log("Contact list created successfully");
} catch (err) {
  console.error("Failed to create contact list:", err.message);
}

// Follow a user - events are automatically published
await hub.run(
  FollowUser,
  "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  "wss://pyramid.fiatjaf.com/",
);

// Unfollow a user
await hub.run(UnfollowUser, "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d");
```

### Using `.exec()` - Manual Event Handling

The [ActionHub.exec](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-actions.ActionHub.html#exec) method executes an action and returns an RxJS Observable of events, giving you complete control over how events are handled and published.

#### Using RxJS forEach for Simple Cases

The RxJS [Observable.forEach](https://rxjs.dev/api/index/class/Observable#foreach) method provides a clean way to handle all events with a single function:

```ts
import { FollowUser } from "applesauce-actions/actions";

// Custom publishing logic for this specific action
const customPublish = async (event: NostrEvent) => {
  // Publish to specific relays
  await relayPool.publish(event, ["wss://relay.damus.io", "wss://nos.lol"]);

  // Save to local database with custom metadata
  await localDatabase.saveContactListUpdate(event, { source: "user_action" });
};

// Execute action and handle each event
await hub.exec(NewContacts).forEach(customPublish);

// Follow user with custom handling
await hub
  .exec(FollowUser, "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d", "wss://pyramid.fiatjaf.com/")
  .forEach(customPublish);
```

#### Using RxJS Subscriptions for Advanced Control

For more complex scenarios, you can manually subscribe to the observable:

```ts
import { tap, catchError, finalize } from "rxjs/operators";
import { EMPTY } from "rxjs";

const subscription = hub
  .exec(FollowUser, userPubkey, relayUrl)
  .pipe(
    tap((event) => console.log("Generated event:", event.kind)),
    catchError((err) => {
      console.error("Action failed:", err);
      return EMPTY; // Handle errors gracefully
    }),
    finalize(() => console.log("Action completed")),
  )
  .subscribe({
    next: async (event) => {
      try {
        await customPublish(event);
        console.log("Event published successfully");
      } catch (err) {
        console.error("Failed to publish event:", err);
      }
    },
    complete: () => {
      console.log("All events processed");
      subscription.unsubscribe();
    },
    error: (err) => {
      console.error("Observable error:", err);
      subscription.unsubscribe();
    },
  });
```

#### Collecting Events Before Publishing

You can collect all events from an action before publishing them:

```ts
import { toArray, lastValueFrom } from "rxjs";

// Collect all events into an array
const events = await lastValueFrom(hub.exec(NewContacts).pipe(toArray()));

console.log(`Action generated ${events.length} events`);

// Publish them in a specific order or with delays
for (const event of events) {
  await publish(event);
  await delay(100); // Small delay between publishes
}
```

## Error Handling

### Action Validation Errors

Actions will throw errors for various validation failures:

```ts
try {
  await hub.run(NewContacts);
} catch (err) {
  if (err.message.includes("contact list already exists")) {
    console.log("User already has a contact list");
  } else {
    console.error("Unexpected error:", err);
  }
}
```

### Publishing Errors

When using `.exec()`, you can handle publishing errors independently:

```ts
await hub.exec(FollowUser, userPubkey).forEach(async (event) => {
  try {
    await publish(event);
  } catch (publishError) {
    console.error("Failed to publish event:", publishError);
    // Could retry, save for later, or notify user
    await saveForRetry(event);
  }
});
```

## Best Practices

### Single ActionHub Instance

Create one ActionHub instance per application and reuse it:

```ts
// app.ts
export const actionHub = new ActionHub(eventStore, eventFactory, publish);

// other-file.ts
import { actionHub } from "./app.js";
await actionHub.run(FollowUser, pubkey);
```

### Conditional Event Store Saving

For actions that generate many events, you might want to control when events are saved to the store:

```ts
const hub = new ActionHub(eventStore, eventFactory, publish);

// Disable automatic saving for bulk operations
hub.saveToStore = false;

// Run bulk action
const events = await lastValueFrom(hub.exec(BulkFollowUsers, userList).pipe(toArray()));

// Manually save only successful events
for (const event of events) {
  try {
    await publish(event);
    await eventStore.add(event); // Save only after successful publish
  } catch (err) {
    console.error("Skipping failed event:", err);
  }
}

// Re-enable automatic saving
hub.saveToStore = true;
```
