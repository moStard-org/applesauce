# React Hooks

## useObservableMemo

The [`useObservableMemo`](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-react.Hooks.useObservableMemo.html) hook is a thing wrapper around the `useObservableState` hook from [observable-hooks](https://observable-hooks.js.org/) that re-creates the observable when the dependencies change and allows `undefined` to returned

This is useful for subscribing to observables that are not created yet

```ts
const account = useActiveAccount(); // IAccount | null

const profile = useObservableMemo(() => {
  if (account) return eventStore.profile(account.pubkey);
  else return undefined;
}, [account.pubkey]);
```

## useEventStore

The [`useEventStore`](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-react.Hooks.useEventStore.html) hook can be used at access the `EventStore` from anywhere in the react tree

## useModel

The [`useModel`](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-react.Hooks.useModel.html) hook requires the `EventStoreProvider` and can be used to create and run a model in the `EventStore` and subscribe to the results

```ts
function UserAvatar({ pubkey }: { pubkey: string }) {
  const profile = useModel(ProfileQuery, [pubkey]);
	// profile will be undefined until the event is loaded

	return <img src={profile?.picture}/>
}
```

## useEventFactory

The [`useEventFactory`](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-react.Hooks.useEventFactory.html) hook can be used at access the `EventFactory` from anywhere in the react tree

## useActiveAccount

The [useActiveAccount](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-react.Hooks.useActiveAccount.html) hook requires the `AccountsProvider` and returns the currently active account or `undefined`

## useAccountManager

The [useAccountManager](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-react.Hooks.useAccountManager.html) hook requires the `AccountsProvider` and returns the `AccountManager` class

## useRenderedContent

The [useRenderedContent](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-react.Hooks.useRenderedContent.html) hook can be used to parse and render an events `content` into a JSX tree

::: info
The components directory should be defined outside of the component itself to avoid unnecessary re-renders
:::

```js
const event = { content: "hello world #grownostr", tags: [["t", "grownostr"]] };

// a directory of optional components to use when rendering the content
const components = {
  // render hashtags inline
  hashtag: ({ node }) => <a href={`/hashtag/${node.hashtag}`}>{node.name}</a>,
  // custom NIP-30 emojis
  emoji: ({ node }) => <img src={node.url} style={{ width: "1.1em" }} />,
};

// A simple component to render an event
function SimpleNote({ event }) {
  const content = useRenderedContent(event, components);

  return (
    <div>
      <div>
        {event.pubkey} {event.created_at}
      </div>
      {content}
    </div>
  );
}

// render the event
<SimpleNote event={event} />;
```
