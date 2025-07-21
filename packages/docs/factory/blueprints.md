# Event Blueprints

Blueprints are pre-configured templates for creating common Nostr events. They encapsulate the logic for setting the correct event kind, content, and tags for specific event types, making it easy to create well-formed Nostr events.

## Using Blueprints

### With EventFactory

The most common way to use blueprints is through an `EventFactory` instance. This allows you to reuse the same context (signer, relay hints, etc.) across multiple events.

```typescript
import { EventFactory } from "applesauce-factory";
import { NoteBlueprint, ReactionBlueprint } from "applesauce-factory/blueprints";

// Create a factory with your context
const factory = new EventFactory({
  signer: mySigner,
  client: { name: "MyApp", address: { identifier: "myapp", pubkey: "pubkey..." } },
});

// Create events using the factory's helper methods
const note = await factory.note("Hello, Nostr!");
const reaction = await factory.reaction(someEvent, "🔥");

// Or use the generic create method with any blueprint
const customNote = await factory.create(NoteBlueprint, "Custom note content #nostr", {
  zapSplit: [{ pubkey: "pubkey...", weight: 100 }],
});
```

### With One-off Context

For one-time event creation, you can use the `create` function with a context and blueprint:

```typescript
import { create } from "applesauce-factory";
import { NoteBlueprint, CommentBlueprint } from "applesauce-factory/blueprints";

// Create a single event with a one-off context
const note = await create(
  { signer: mySigner }, // context
  NoteBlueprint, // blueprint constructor
  "Hello, world!", // blueprint arguments
);

// Create a comment on an existing event
const comment = await create({ signer: mySigner }, CommentBlueprint, parentEvent, "Great post!");
```

## Available Blueprints

- `NoteBlueprint(content, options?)`
- `CommentBlueprint(parent, content, options?)`
- `NoteReplyBlueprint(parent, content, options?)`
- `ReactionBlueprint(event, emoji?)`
- `ShareBlueprint(event, options?)`
- `PicturePostBlueprint(pictures, content, options?)`
- `FileMetadataBlueprint(file, options?)`
- `DeleteBlueprint(events)`
- `LiveStreamBlueprint(title, options?)`

And a lot more in the [reference](https://hzrd149.github.io/applesauce/typedoc/modules/applesauce-factory.Blueprints.html).

## Custom Blueprints

You can create your own custom blueprints by following the same pattern used by the built-in blueprints. A blueprint is a function that returns a call to the `blueprint()` helper function.

### Basic Custom Blueprint

```typescript
import { kinds } from "nostr-tools";
import { blueprint } from "applesauce-factory";
import { includeSingletonTag, MetaTagOptions } from "applesauce-factory/operations";

/** Custom event blueprint */
export function AppConfigBlueprint(config: Record<string, any>) {
  return blueprint(
    kinds.AplicationData, // or your custom kind number
    // Add your operations here
    setContent(JSON.stringify(config)),
    includeSingletonTag(["d", "app-config"]),
  );
}
```

### Using Your Custom Blueprint

Once created, use your custom blueprint just like the built-in ones:

```typescript
// With EventFactory
const customEvent = await factory.create(AppConfigBlueprint, { theme: "light" });

// With one-off context
const advancedEvent = await create({ signer: mySigner }, AppConfigBlueprint, { theme: "light" });
```

## Blueprint Patterns

### Common Patterns

1. **Type Safety**: Always define TypeScript types for your blueprint options
2. **Conditional Operations**: Use ternary operators to conditionally apply operations
3. **Reusable Operations**: Extract common logic into reusable operation functions
4. **Context Usage**: Leverage the context for relay hints, custom emojis, and other shared data

### Best Practices

- Keep blueprints focused on a single event type
- Use descriptive names and comprehensive JSDoc comments
- Validate inputs when necessary (like the `PicturePostBlueprint` does for image types)
- Combine multiple operations for complex event structures
- Always handle optional parameters gracefully
