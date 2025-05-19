import { Container, Stack, Typography } from "@mui/material";
import { EventStore, QueryStore } from "applesauce-core";
import { getProfilePicture } from "applesauce-core/helpers";
import { TimelineQuery } from "applesauce-core/queries";
import { QueryStoreProvider } from "applesauce-react";
import { useStoreQuery } from "applesauce-react/hooks";
import { SimplePool } from "nostr-tools";
import { useEffect } from "react";

const eventStore = new EventStore();
const queryStore = new QueryStore(eventStore);

const pool = new SimplePool();

function RecentUsers() {
  useEffect(() => {
    const sub = pool.subscribeMany(["wss://relay.damus.io", "wss://nostrue.com"], [{ kinds: [0], limit: 100 }], {
      onevent: (event) => eventStore.add(event),
    });

    return () => sub.close();
  }, []);

  const events = useStoreQuery(TimelineQuery, [[{ kinds: [0] }]]);

  return (
    <Container>
      <Typography variant="h5" gutterBottom>
        Recent users
      </Typography>

      <Stack direction="row" flexWrap="wrap">
        {events?.map((event) => (
          <div key={event.pubkey} className="avatar">
            <div className="w-16 rounded-full">
              <img src={getProfilePicture(event, `https://robohash.org/${event.pubkey}.png`)} />
            </div>
          </div>
        ))}
      </Stack>
    </Container>
  );
}

export default function App() {
  return (
    <QueryStoreProvider queryStore={queryStore}>
      <RecentUsers />
    </QueryStoreProvider>
  );
}
