# Applesauce-react

## Install

```bash
npm install applesauce-react
```

## Using providers

To start using applesauce with react you must add some of the providers to your react root

- If you want to use the `useStoreQuery` hook you must add the [QueryStoreProvider](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-react.QueryStoreProvider.html)
- If you want to use the `useEventFactory` hook you must add the [FactoryProvider](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-react.FactoryProvider.html)
- If you want to use the `useAccountManager` or `useActiveAccount` hook you must add the [AccountsProvider](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-react.AccountsProvider.html)
- If you want to use the `useEventStore` hook you must add the `EventStoreProvider` or [QueryStoreProvider](https://hzrd149.github.io/applesauce/typedoc/functions/applesauce-react.QueryStoreProvider.html)

## Simple setup

A simple example would look like

```js
import { EventStore, QueryStore } from "applesauce-core";
import { useEventStore } from "applesauce-react/hooks";
import { QueryStoreProvider } from "applesauce-react/providers";

const eventStore = new EventStore();
const queryStore = new QueryStore(eventStore);

function App() {
  // get event store from context
  const store = useEventStore();

  return <div></div>;
}

const root = createRoot(document.getElementById("root"));

root.render(
  // the QueryStoreProvider also wraps the EventStoreProvider
  <QueryStoreProvider queryStore={queryStore}>
    <App />
  </QueryStoreProvider>,
);
```

## Advanced setup

A more complete example that uses all the providers would look something like

First create a new `AccountManager` that saves its state to local storage

```js
// accounts.js
import { safeParse } from "applesauce-core/helpers/json";
import { AccountManager, registerCommonAccountTypes } from "applesauce-accounts";

// setup account manager
const accountManager = new AccountManager();
registerCommonAccountTypes(accountManager);
accountManager.registerType(AmberClipboardAccount);

// load all accounts
if (localStorage.getItem("accounts")) {
  const json = safeParse(localStorage.getItem("accounts"));
  if (json) accountManager.fromJSON(json);
}

// save accounts to localStorage when they change
accountManager.accounts$.subscribe(() => {
  localStorage.setItem("accounts", JSON.stringify(accountManager.toJSON()));
});

// load active account
if (localStorage.active) accountManager.setActive(localStorage.active);

// save active to localStorage
accountManager.active$.subscribe((account) => {
  if (account) localStorage.setItem("active", account.id);
  else localStorage.removeItem("active");
});

export default accountManager;
```

Next update `app.js` to use the new hooks

```js
// app.js
import { NoteBlueprint } from "applesauce-factory/blueprints";
import { useEventStore, useEventFactory, useActiveAccount } from "applesauce-react/hooks";

function App() {
  // get event store from context
  const account = useActiveAccount();
  const store = useEventStore();
  const factory = useEventFactory();

  const post = async () => {
    // ignore if no active account
    if (!account) return;

    const draft = await factory.create(NoteBlueprint, "hello world");
    const signed = await account.signEvent(draft);

    store.add(signed);
  };

  return (
    <div>
      <button onClick={post}>post</button>
    </div>
  );
}

export default App;
```

And finally update `index.js` to use the Providers

```js
// index.js
import { EventStore, QueryStore } from "applesauce-core";
import { EventFactory } from "applesauce-factory";
import { NoteBlueprint } from "applesauce-factory/blueprints";
import { useEventStore, useEventFactory, useActiveAccount } from "applesauce-react/hooks";
import { QueryStoreProvider, AccountsProvider, FactoryProvider } from "applesauce-react/providers";

import accountManager from "./accounts.js";
import App from "./app.js";

// create event store and factory
const eventStore = new EventStore();
const queryStore = new QueryStore(eventStore);

const factory = new EventFactory({
  // use the active signer from the account manager
  signer: accountManager.signer,
});

const root = createRoot(document.getElementById("root"));

root.render(
  // provide the stores, factory, and accounts to the react app
  <QueryStoreProvider queryStore={queryStore}>
    <AccountsProvider manager={accountManager}>
      <FactoryProvider factory={factory}>
        <App />
      </FactoryProvider>
    </AccountsProvider>
  </QueryStoreProvider>,
);
```
