import { Avatar, Card, CardContent, CardHeader, Container, Stack, Tab, Tabs } from "@mui/material";
import { EventStore, mapEventsToStore, mapEventsToTimeline } from "applesauce-core";
import { getDisplayName, getProfileContent, getSeenRelays } from "applesauce-core/helpers";
import { createAddressLoader } from "applesauce-loaders";
import { useObservable } from "applesauce-react/hooks";
import { onlyEvents, RelayPool } from "applesauce-relay";
import { NostrEvent } from "nostr-tools";
import { useMemo, useState } from "react";
import { map } from "rxjs";

// Create an event store for all events
const eventStore = new EventStore();

// Create a relay pool to make relay connections
const pool = new RelayPool();

// Create an address loader to load user profiles
const addressLoader = createAddressLoader(pool.request.bind(pool), {
  // Make the cache requests attempt to load from a local relay
  cacheRequest: (filters) => pool.relay("ws://localhost:4869").request(filters),
  // Fallback to lookup relays if profiles cant be found
  lookupRelays: ["wss://purplepag.es"],
});

function Note({ note }: { note: NostrEvent }) {
  const profile$ = useMemo(() => {
    // Get the relays the event was from
    const relays = getSeenRelays(note);
    // Make a request to the address loader for the users profile
    return addressLoader({ kind: 0, pubkey: note.pubkey, relays: relays && Array.from(relays) });
  }, [note.pubkey]);

  // Subscribe to the request and wait for the profile event
  const profile = useObservable(profile$);

  // Parse the profile event into the metadata
  const metadata = useMemo(() => profile && getProfileContent(profile), [profile]);

  return (
    <Card>
      <CardHeader avatar={<Avatar src={metadata?.picture} />} title={getDisplayName(profile)} />
      <CardContent>
        <div>{note.content}</div>
      </CardContent>
    </Card>
  );
}

export default function RelayTimeline() {
  const [relay, setRelay] = useState("wss://relay.devvul.com");

  // Create a timeline observable
  const timeline$ = useMemo(
    () =>
      pool
        .relay(relay)
        .subscription({ kinds: [1] })
        .pipe(
          // Only get events from relay (ignore EOSE)
          onlyEvents(),
          // deduplicate events using the event store
          mapEventsToStore(eventStore),
          // collect all events into a timeline
          mapEventsToTimeline(),
          // Duplicate the timeline array to make react happy
          map((t) => [...t]),
        ),
    [relay],
  );

  // Subscribe to the timeline and get the events
  const events = useObservable(timeline$);

  return (
    <Container>
      <Tabs
        value={relay}
        onChange={(_, newValue) => setRelay(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="relay selection tabs"
      >
        <Tab label="relay.devvul.com" value="wss://relay.devvul.com" />
        <Tab label="relay.damus.io" value="wss://relay.damus.io" />
        <Tab label="nos.lol" value="wss://nos.lol" />
      </Tabs>

      <Stack spacing={2} direction="column" paddingY={2}>
        {events?.map((event) => <Note key={event.id} note={event} />)}
      </Stack>
    </Container>
  );
}
