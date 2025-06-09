# Actions

Actions are pre-built async operations apps can perform. they use the `EventStore` as state, the `EventFactory` to build new events, and a `publish` method to publish or save the resulting events

## Installation

:::code-group

```sh [npm]
npm install applesauce-actions
```

```sh [yarn]
yarn install applesauce-actions
```

```sh [pnpm]
pnpm install applesauce-actions
```

:::

## Action Hub

The [ActionHub](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-actions.ActionHub.html) class is a simple manager that combines the event store, event factory, and an optional publish method into a single place to make it easier to run actions

```ts
import { ActionHub } from "applesauce-actions";

// Custom publish logic
const publish = async (event: NostrEvent) => {
  console.log("Publishing", event);
  await app.relayPool.publish(event, app.defaultRelays);
};

// Create a new action hub with an event store, event factory, and custom publish method
const hub = new ActionHub(eventStore, eventFactory, publish);

// Or don't provide a publish method and manually handle the publishing for each action
const hub = new ActionHub(eventStore, eventFactory);
```

:::info
For performance reasons, its recommended to only create a single `ActionHub` instance for your whole app
:::

## What is an action

An [Action](https://hzrd149.github.io/applesauce/typedoc/types/applesauce-actions.Action.html) is an [AsyncIterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncIterator) that reads from the `EventStore` and yields nostr events to be published using the `EventFactory`

You can see the full list of built-in actions in the [reference](https://hzrd149.github.io/applesauce/typedoc/modules/applesauce-actions.Actions.html)

:::warning
To avoid overriding replaceable events, actions will throw if an existing replaceable event cant be found
:::

## Running using async/await

[ActionHub.run](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-actions.ActionHub.html#run) can be used to run actions and `await` for them to complete

:::warning
`ActionHub.run` will throw an error if a `publish` method was not provided when creating the `new ActionHub`
:::

```ts
import { FollowUser } from "applesauce-actions/actions";

// create a new contact list event
try {
  await hub.run(NewContacts);
} catch (err) {
  // this will throw if a contact list already exists
}

// follow a user
await hub.run(
  FollowUser,
  "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  "wss://pyramid.fiatjaf.com/",
);
```

## Running using observables

If your looking to manually handle publish events for each action run, then [ActionHub.exec](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-actions.ActionHub.html#exec) can be used to run an action and subscribe to a stream of nostr events to publish

:::info
The RxJS [Observable.forEach](https://rxjs.dev/api/index/class/Observable#foreach) method provides a clean way to pipe all the events to a single method an use `await` to wait for completion
:::

```ts
import { FollowUser } from "applesauce-actions/actions";

// custom one-off publish method
const publish = (event) => {
  relayPool.push(["wss://relay.com"], event);

  // Extra work to save the contact list to a local DB
  localDatabase.saveNewContacts(event);
};

// run the action and send all events to a custom publish method, then wait for complete
await hub.exec(NewContacts).forEach(publish);

// manually handle rxjs subscription
const sub = hub
  .exec(FollowUser, "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d", "wss://pyramid.fiatjaf.com/")
  .subscribe({
    // pass events to publish methode
    next: publish,
    // cleanup subscription on complete
    complete: () => sub.unsubscribe(),
  });
```

## Prebuilt actions

The `applesauce-actions` package comes with some connect prebuilt actions for social clients, you can find them in the [typescript docs](https://hzrd149.github.io/applesauce/typedoc/modules/applesauce-actions.Actions.html)

## Custom actions

Custom actions are simply methods that take custom arguments and return an async iterator method that yields signed nostr events to publish

```ts
import { Action } from "applesauce-actions";
import { updateProfileContent } from "applesauce-factory/operations/event";

function CustomSetNameAction(newName = "fiatjaf"): Action {
  return async function* ({ events, factory, self }) {
    // get the profile event
    const profile = events.getReplaceable(0, self);

    // throw if the profile event cant be found
    if (!profile) throw new Error("Cant find profile");

    // create a new unsigned profile event with a new name
    const draft = await factory.modify(profile, updateProfileContent({ name: newName }));

    // request the user to sign the event
    const signed = await factory.sign(draft);

    // ask the app the publish the app
    yield signed;
  };
}
```
