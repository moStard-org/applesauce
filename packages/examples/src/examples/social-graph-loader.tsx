import { EventStore, logger } from "applesauce-core";
import { getProfilePointersFromList, mergeRelaySets } from "applesauce-core/helpers";
import {
  createAddressPointerLoadingSequence,
  loadAddressPointersFromCache,
  loadAddressPointersFromRelayHints,
  loadAddressPointersFromRelays,
  loadAddressPointersFromStore,
  NostrRequest,
  triggerPipeline,
} from "applesauce-loaders";
import { useObservable } from "applesauce-react/hooks";
import { completeOnEose, RelayPool } from "applesauce-relay";
import { ExtensionSigner } from "applesauce-signers";
import { Filter, kinds, NostrEvent } from "nostr-tools";
import { ProfilePointer } from "nostr-tools/nip19";
import { useMemo, useState } from "react";
import {
  BehaviorSubject,
  bufferTime,
  combineLatest,
  distinct,
  EMPTY,
  filter,
  mergeMap,
  Observable,
  of,
  ReplaySubject,
  scan,
  Subject,
  take,
  tap,
} from "rxjs";

const log = logger.extend("SocialGraph");

const store = new EventStore();
const pool = new RelayPool();

const lookupRelays = new BehaviorSubject<string[]>(["wss://purplepag.es"]);

/** Create a simple method that takes an array of address pointers and returns an observable of events */
const addressLoader = createAddressPointerLoadingSequence(
  // First return any address pointers that are already in the store
  loadAddressPointersFromStore(store),
  // Then try to load from the cache
  loadAddressPointersFromCache((filters) => of()),
  // Then try to load from the hints
  loadAddressPointersFromRelayHints(pool.request.bind(pool)),
  // Then attempt to load from the lookup relays
  loadAddressPointersFromRelays(pool.request.bind(pool), lookupRelays),
);

export function createBatchUserLoader(
  request: NostrRequest,
  opts?: { relays?: string[]; kinds?: number[]; hints?: boolean },
): (user: ProfilePointer) => Observable<NostrEvent> {
  // Use a replay subject to queue all inputs until loader is started
  const input = new ReplaySubject<ProfilePointer>(Infinity);

  const output = input.pipe(
    // skip duplicates
    distinct((user) => user.pubkey),
    // buffer for 1 second
    bufferTime(1_000, undefined, 300),
    // Ignore empty buffers
    filter((buffer) => buffer.length > 0),
    // merge users into a single request
    mergeMap((users) => {
      const filter: Filter = {
        kinds: opts?.kinds || [kinds.Contacts, kinds.Metadata, kinds.Mutelist],
        authors: users.map((u) => u.pubkey),
      };
      const relays = (opts?.hints ?? true) ? mergeRelaySets(opts?.relays, ...users.map((u) => u.relays)) : opts?.relays;

      // If there are no relays, skip
      if (!relays) return EMPTY;

      return request(relays, [filter]).pipe(completeOnEose());
    }, 1),
  );

  return (user: ProfilePointer) => triggerPipeline({ input, output }, user, (event) => event.pubkey === user.pubkey);
}

function createGraphLoader(
  request: NostrRequest,
  opts?: { relays?: string[]; hints?: boolean; kinds?: number[] },
): (
  pointer: ProfilePointer & { distance: number },
) => Observable<{ total: number; loaded: number; event: NostrEvent }> {
  const upstream = createBatchUserLoader(request, opts);

  const input = new ReplaySubject<ProfilePointer & { distance: number }>(Infinity);

  // Filter out duplicates
  const queue = input.pipe(distinct((pointer) => pointer.pubkey));

  const total = queue.pipe(scan((acc) => acc + 1, 0));
  const loaded = new Subject<string>();
  const loadedCount = loaded.pipe(
    distinct(),
    scan((acc) => acc + 1, 0),
  );

  const loader = queue.pipe(
    mergeMap((pointer) => {
      log(`Loading ${pointer.pubkey} at distance ${pointer.distance}`);

      return upstream(pointer).pipe(
        tap(() => loaded.next(pointer.pubkey)),
        filter((e) => e.kind === kinds.Contacts),
        take(1),
        tap((event) => {
          const contacts = getProfilePointersFromList(event);

          if (pointer.distance >= 0) {
            for (const contact of contacts) input.next({ ...contact, distance: pointer.distance - 1 });
          }
        }),
      );
    }),
  );

  const output = combineLatest({ total, loaded: loadedCount, event: loader });

  return (user: ProfilePointer & { distance: number }) =>
    new Observable((observer) => {
      input.next(user);
      return output.subscribe(observer);
    });
}

const graphLoader = createGraphLoader((relays, filters) => pool.request(relays, filters), {
  relays: ["ws://localhost:4869"],
  hints: false,
  kinds: [3],
});

export default function SocialGraphLoader() {
  const [root, setRoot] = useState<string | null>(() => {
    const url = new URL(window.location.href);
    return url.searchParams.get("root");
  });

  const observable = useMemo(() => (root ? graphLoader({ pubkey: root, distance: 1 }) : EMPTY), [root]);
  const progress = useObservable(observable);

  return (
    <div>
      <input value={root || ""} onChange={(e) => setRoot(e.target.value)} />

      <button onClick={async () => setRoot(await new ExtensionSigner().getPublicKey())}>set from extension</button>

      <code className="whitespace-pre">
        {JSON.stringify({ total: progress?.total, loaded: progress?.loaded }, null, 2)}
      </code>
    </div>
  );
}
