import { logger } from "applesauce-core";
import { getProfilePointersFromList } from "applesauce-core/helpers";
import { AddressPointerLoader, addressLoader, NostrRequest } from "applesauce-loaders";
import { useObservable } from "applesauce-react/hooks";
import { RelayPool } from "applesauce-relay";
import { ExtensionSigner } from "applesauce-signers";
import { kinds, NostrEvent } from "nostr-tools";
import { ProfilePointer } from "nostr-tools/nip19";
import { useMemo, useState } from "react";
import {
  combineLatest,
  distinct,
  EMPTY,
  filter,
  mergeMap,
  Observable,
  ReplaySubject,
  scan,
  Subject,
  take,
  tap,
} from "rxjs";

const log = logger.extend("SocialGraph");

const pool = new RelayPool();

function createGraphLoader(
  request: NostrRequest,
  opts?: { relays?: string[]; hints?: boolean; kinds?: number[]; addressLoader?: AddressPointerLoader },
): (
  pointer: ProfilePointer & { distance: number },
) => Observable<{ total: number; loaded: number; event: NostrEvent }> {
  const loadAddress = opts?.addressLoader || addressLoader(request);

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

      return loadAddress({ kind: 3, pubkey: pointer.pubkey, relays: pointer.relays }).pipe(
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
