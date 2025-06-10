# applesauce-solidjs

[SolidJS](https://www.solidjs.com/) hooks and providers for applesauce

## Installation

```bash
npm install applesauce-solidjs
```

## Example

```tsx
import { from } from "solid-js";
import { EventStore, Models } from "applesauce-core";

const eventStore = new EventStore();

function UserName({ pubkey }: { pubkey: string }) {
  const profile = from(eventStore.model(Models.ProfileModel, [pubkey]));

  return <span>{profile() ? profile().name : "loading..."}</span>;
}

function App() {
  return (
    <EventStoreProvider eventStore={eventStore}>
      <h1>App</h1>

      <UserName pubkey="82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2" />
    </EventStoreProvider>
  );
}
```
