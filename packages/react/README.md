# applesauce-react

React hooks and providers for applesauce

## Installation

```bash
npm install applesauce-react
```

## Example

```tsx
import { EventStore, QueryStore, Queries } from "applesauce-core";
import { QueryStoreProvider } from "applesauce-react/providers";
import { useStoreQuery } from "applesauce-react/hooks";

const eventStore = new EventStore();
const queryStore = new QueryStore(eventStore);

function UserName({ pubkey }) {
  const profile = useStoreQuery(Queries.ProfileQuery, [pubkey]);

  return <span>{profile.name || "loading..."}</span>;
}

function App() {
  return (
    <QueryStoreProvider queryStore={queryStore}>
      <h1>App</h1>

      <UserName pubkey="82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2" />
    </QueryStoreProvider>
  );
}
```
