# Event Factory

The `EventFactory` is a class that can be used to create new events based on blueprints and a [Signer](../signers/signers.md).

## Creating a factory

When creating a new event factory you can pass a [context](https://hzrd149.github.io/applesauce/typedoc/types/applesauce-factory.EventFactoryContext.html) object in that is used by all blueprints

```ts
const signer = new SimpleSigner();

const factory = new EventFactory({
  // optionally pass a signer in (required for encryption)
  signer: signer,
  // optionally set a NIP-89 client
  client: {
    name: "My Awesome Client",
    address: {
      pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
      identifier: "awesome-client",
    },
  },
});
```

## Relay hints

Relay hints can ge added to all event tags that support them by passing in `getEventRelayHint` and `getPubkeyRelayHint` methods into the [context](https://hzrd149.github.io/applesauce/typedoc/types/applesauce-factory.EventFactoryContext.html)

```ts
const factory = new EventFactory({
  getEventRelayHint: async (event) => {
    // an async process to find the best relay hint for this event
    try {
      return await calculateRelayHint(event)
    }
    catch(){
      return undefined
    }
  },
  getPubkeyRelayHint: async (pubkey) => {
    // an async process to find a relay hint for this pubkey
    return loadPubkeyMailboxes(pubkey).then((mailboxes) => getOutboxes(mailboxes)[0]);
  },
});
```

## Using a blueprint

The [`factory.create`](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-factory.EventFactory.html#create) method can be used to create an event from a blueprint

```ts
await factory.create(NoteBlueprint, "hello world");
```

## Modifying an event

The [EventFactory.modify](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-factory.EventFactory.html#modify) and [EventFactory.modifyTags](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-factory.EventFactory.html#modifyTags) methods can be used to modify replaceable events

The first method `modify` takes a list of [EventOperations](https://hzrd149.github.io/applesauce/typedoc/modules/applesauce-factory.Operations.html) and is useful for modifying common properties of a list event like name, description, or image

```js
const list = {
  kind: 30003,
  content: "",
  tags: [
    ["title", "read later"],
    ["description", "notes ill read later"],
  ],
};

const modified = await factory.modify(
  list,
  setListTitle("read never"),
  setListDescription("I will never get around to reading these notes"),
);
```

The second method `modifyTags` takes of list of [TagOperations](https://hzrd149.github.io/applesauce/typedoc/types/applesauce-factory.Operations.TagOperation.html) and is useful for modifying the public (or hidden) `tags` array of a replaceable event

For example, removing an `e` tag from a bookmark list

```js
const list = {
  kind: 30003,
  content: "",
  tags: [
    ["d", "bookmarked-events"],
    ["e", "00004df629c94f844e1986ba6cd5e04ef26acc966f3af10eeb085221a71c951b"],
  ],
};

const modified = await factory.modifyTags(
  list,
  // pass tag operations in directly to modify public tags
  removeEventTag("00004df629c94f844e1986ba6cd5e04ef26acc966f3af10eeb085221a71c951b"),
);
```

Or adding an inbox relay to a NIP-65 mailboxes event

```js
const mailboxes = {
  kind: 10002,
  content: "",
  tags: [["r", "wss://relay.io/", "read"]],
};

const modified = await factory.modifyTags(
  mailboxes,
  // will change the existing "r" tag to ["r, "wss://relay.io/"] (both read and write)
  addOutboxRelay("wss://relay.io/"),
  // will add a new ["r", "wss://nostr.wine/", "write"] tag
  addOutboxRelay("wss://nostr.wine/"),
);
```

It also supports modifying the "hidden" tags (encrypted tags array) in [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) list events `content`

```js
const list = {
  kind: 30003,
  content: "KRf3JTN1KcM0YduFfeHPoIXf+2H5fpdv02sU4CZ8zR0=?iv=zNnctFWMyU92HdpUl/XTOg==",
  tags: [["d", "28bn20gh82"]],
};

// add a signer to factory so it can decrypt
factory.context.signer = window.nostr;

// will attempt to decrypt "content" before modifying hidden tags
const modified = await factory.modifyTags(list, {
  hidden: [removeEventTag("00004df629c94f844e1986ba6cd5e04ef26acc966f3af10eeb085221a71c951b")],
});
```

## Quick helper methods

The `EventFactory` class has a few helper methods on it for building common event types:

- [`factory.note`](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-factory.EventFactory.html#note) is a shortcut for `NoteBlueprint`
- [`factory.noteReply`](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-factory.EventFactory.html#noteReply) is a shortcut for `NoteReplyBlueprint`
- [`factory.comment`](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-factory.EventFactory.html#comment) is a shortcut for `CommentBlueprint`
- [`factory.reaction`](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-factory.EventFactory.html#reaction) is a shortcut for `ReactionBlueprint`
- [`factory.share`](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-factory.EventFactory.html#share) is a shortcut for `ShareBlueprint`
- [`factory.delete`](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-factory.EventFactory.html#delete) is a shortcut for `DeleteBlueprint`

## Manually creating an event

The [`factory.build`](https://hzrd149.github.io/applesauce/typedoc/classes/applesauce-factory.EventFactory.html#build) method can be used to create an event from an `EventTemplate` and [EventOperations](https://hzrd149.github.io/applesauce/typedoc/modules/applesauce-factory.Operations.html)

```ts
import { includeSingletonTag, setContent, includeAltTag } from "applesauce-factory/operations";

await factory.build(
  { kind: 1063 },
  setContent("the bitcoin whitepaper"),
  includeAltTag("File metadata"),
  includeSingletonTag(["x", "b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553"]),
  includeSingletonTag(["size", "184292"]),
  includeSingletonTag(["m", "application/pdf"]),
  includeSingletonTag([
    "url",
    "https://cdn.example.com/b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553.pdf",
  ]),
);
```

## Prebuilt blueprints

The `applesauce-factory` package comes with common event blueprints for social clients. you can find them in the [typescript docs](https://hzrd149.github.io/applesauce/typedoc/modules/applesauce-factory.Blueprints.html)
