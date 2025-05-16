# Applesauce Actions

A collection of pre-built actions nostr clients can use. Built on top of `applesauce-core` and `applesauce-factory`.

[Documentation](https://hzrd149.github.io/applesauce/typedoc/modules/applesauce-actions.html)

## Installation

```bash
npm install applesauce-actions
```

## Overview

Actions are common pre-built async operations that apps can perform. They use:

- `EventStore` for access to known nostr events
- `EventFactory` to build and sign new nostr events
- A `publish` method to publish or save the resulting events

The package provides an `ActionHub` class that combines these components into a single manager for easier action execution.

## Basic Usage

```typescript
import { ActionHub } from "applesauce-actions";
import { FollowUser } from "applesauce-actions/actions";

async function publishEvent(event: NostrEvent) {
  await relayPool.publish(event, ["wss://relay.example.com"]);
}

// Create an action hub with your event store, factory and publish method
const hub = new ActionHub(eventStore, eventFactory, publishEvent);

// Example: Follow a user
await hub
  .exec(FollowUser, "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d")
  .forEach((event) => publishEvent(event));
```

For more detailed documentation and examples, visit the [full documentation](https://hzrd149.github.io/applesauce/overview/actions.html).
