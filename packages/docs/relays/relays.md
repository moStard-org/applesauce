# Relay Class

The `Relay` class provides a reactive interface for connecting to and communicating with Nostr relays using RxJS observables.

## Creating a Relay Connection

```typescript
import { Relay } from "applesauce-relay";

// Create a new relay instance
const relay = new Relay("wss://relay.example.com");

// Access relay state observables
relay.connected$.subscribe((connected) => console.log("Connection status:", connected));

relay.notices$.subscribe((notices) => console.log("Relay notices:", notices));
```

## Subscribing to Events

The `req` or `subscription` methods returns an observable that emits events from the relay.

:::info
The `subscription` method is a wrapper around the `req` method that automatically handles reconnection and retries.
:::

```typescript
// Subscribe to specific kinds of events
relay
  .req({
    kinds: [1],
    authors: ["pubkey1", "pubkey2"],
  })
  .subscribe({
    next: (response) => {
      if (response === "EOSE") {
        console.log("End of stored events");
      } else {
        console.log("Event:", response);
      }
    },
    error: (err) => console.error("Subscription error:", err),
  });
```

## Publishing Events

Send events to the relay using the `event` or `publish` methods.

:::info
The `publish` method is a wrapper around the `event` method that returns a `Promise` and automatically handles reconnecting and retrying.
:::

```typescript
import { generatePrivateKey, getPublicKey, getEventHash, signEvent } from "nostr-tools";

const sk = generatePrivateKey();
const pk = getPublicKey(sk);

const event = {
  kind: 1,
  pubkey: pk,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: "Hello Nostr!",
};

event.id = getEventHash(event);
event.sig = signEvent(event, sk);

// Use the observable method
relay.event(event).subscribe((response) => {
  console.log(`Published: ${response.ok}`, response.message);
});

// Or use the publish method with await
const response = await relay.publish(event);
console.log(`Published: ${response.ok}`, response.message);
```

## Making One-time Requests

Use the `request` method for one-time queries that complete after receiving `EOSE`.

```typescript
import { lastValueFrom } from "rxjs";
import { getProfileContent } from "applesauce-core/helpers";

// Get latest user profile
async function getProfile(pubkey) {
  const events = await lastValueFrom(
    relay.request({
      kinds: [0],
      authors: [pubkey],
      limit: 1,
    }),
  );

  return getProfileContent(events[0]);
}
```

## Authentication

The `Relay` class supports [NIP-42](https://github.com/nostr-protocol/nips/blob/master/42.md) authentication and keeps track of the authentication state and challenge.

- `challenge$` - An observable that tracks the authentication challenge from the relay.
- `authenticated$` - An observable that tracks the authentication state of the relay.
- `authenticate` - An async method that can be used to authenticate the relay.

More information about authentication can be found in the [typedocs](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-relay.Relay).

```typescript
// Listen for authentication challenges
relay.challenge$.subscribe((challenge) => {
  if (!challenge) return;

  // Using browser extension as signer
  relay
    .authenticate(window.nostr)
    .then(() => {
      console.log("Authentication successful");
    })
    .catch((err) => {
      console.error("Authentication failed:", err);
    });
});
```

If you want to manually build the authentication event you can use the `auth` method to send the event to the relay.

```typescript
import { makeAuthEvent } from "nostr-tools/nip42";

// Listen for authentication challenges
relay.challenge$.subscribe(async (challenge) => {
  if (!challenge) return;

  // Create a new auth event and sign it
  const auth = await window.nostr.signEvent(makeAuthEvent(relay.url, challenge));

  // Send it to the relay and wait for the response
  relay.auth(auth).subscribe({
    next: (response) => {
      console.log("Authentication response:", response);
    },
    error: (err) => {
      console.error("Authentication failed:", err);
    },
  });
});
```

## Persistent Subscriptions

The `subscription` method can be used to create persistent subscriptions that automatically reconnect after connection issues.

```typescript
// Create a persistent subscription
const subscription = relay
  .subscription({ kinds: [1, 6], since: Math.floor(Date.now() / 1000) }, { id: "feed", retries: 3 })
  .subscribe({
    next: (response) => {
      if (response !== "EOSE") {
        console.log("New event:", response.content);
      }
    },
  });

// Later, to unsubscribe
subscription.unsubscribe();
```

## Dynamic Filters

The `req`, and `subscription` methods can accept an observable for the filters. this allows for you to set the filters later or update them dynamically.

:::warning
Make sure to use a `ReplaySubject`, `BehaviorSubject`, or the `shareReplay(1)` operator to keep the last filters in case the relay disconnects and needs to resubscribe.
:::

```typescript
import { BehaviorSubject } from "rxjs";
import { onlyEvents } from "applesauce-relay/operators";

// Create a subject with initial filters
const filters = new BehaviorSubject({
  kinds: [1],
  limit: 20,
});

// Subscribe using dynamic filters
relay
  .req(filters)
  .pipe(onlyEvents())
  .subscribe((event) => console.log(event.content));

// Update filters later
setTimeout(() => {
  filters.next({
    kinds: [1],
    "#t": ["nostr"],
    limit: 20,
  });
}, 5000);
```

## Relay Information

The `Relay` class keeps track of the relay information and emits it as an observable from the `information$` property.

```typescript
// Get relay information
relay.information$.subscribe((info) => {
  if (info) {
    console.log("Relay name:", info.name);
    console.log("Supported NIPs:", info.supported_nips);
    console.log("Software:", info.software);

    if (info.limitation) {
      console.log("Max message size:", info.limitation.max_message_length);
    }
  }
});
```
