import { EventStore, IEventStore, mapEventsToStore } from "applesauce-core";
import { getProfilePointersFromList, mergeRelaySets } from "applesauce-core/helpers";
import { addressPointerLoader, AddressPointerLoader } from "applesauce-loaders/loaders";
import { LoadableAddressPointer } from "applesauce-loaders/helpers/address-pointer";
import { wrapGeneratorFunction } from "applesauce-loaders/operators";
import { useObservable } from "applesauce-react/hooks";
import { RelayPool } from "applesauce-relay";
import { ExtensionSigner } from "applesauce-signers";
import { kinds, NostrEvent } from "nostr-tools";
import { ProfilePointer } from "nostr-tools/nip19";
import { useMemo, useState } from "react";
import { EMPTY, firstValueFrom, identity, isObservable, Observable } from "rxjs";

// const log = logger.extend("SocialGraph");

const eventStore = new EventStore();
const pool = new RelayPool();

// function createGraphLoader(
//   addressLoader: loaders.AddressPointerLoader,
//   opts?: {
//     /** Extra relays to laod from */
//     relays?: string[];
//     /** Whether to follow relay hints in contact events */
//     hints?: boolean;
//     kinds?: number[];
//   },
// ): (
//   pointer: ProfilePointer & { distance: number },
// ) => Observable<{ total: number; loaded: number; event: NostrEvent }> {
//   const input = new ReplaySubject<ProfilePointer & { distance: number }>(Infinity);

//   // Filter out duplicates
//   const queue = input.pipe(distinct((pointer) => pointer.pubkey));

//   const total = queue.pipe(scan((acc) => acc + 1, 0));
//   const loaded = new Subject<string>();
//   const loadedCount = loaded.pipe(
//     distinct(),
//     scan((acc) => acc + 1, 0),
//   );

//   const loader = queue.pipe(
//     mergeMap((pointer) => {
//       const relays = opts?.hints === false ? opts?.relays : mergeRelaySets(pointer.relays, opts?.relays);

//       log(`Loading ${pointer.pubkey} at distance ${pointer.distance} from ${relays?.join(", ")}`);
//       const address: LoadableAddressPointer = {
//         kind: kinds.Contacts,
//         pubkey: pointer.pubkey,
//         relays,
//       };

//       return addressLoader(address).pipe(
//         tap(() => loaded.next(pointer.pubkey)),
//         tap((event) => {
//           const contacts = getProfilePointersFromList(event);

//           if (pointer.distance >= 0) {
//             for (const contact of contacts) input.next({ ...contact, distance: pointer.distance - 1 });
//           }
//         }),
//       );
//     }),
//   );

//   const output = combineLatest({ total, loaded: loadedCount, event: loader });

//   return (user: ProfilePointer & { distance: number }) =>
//     new Observable((observer) => {
//       input.next(user);
//       return output.subscribe(observer);
//     });
// }

/** A loader that loads the social graph of a user out to a set distance */
export type SocialGraphLoader = (user: ProfilePointer & { distance: number }) => Observable<NostrEvent>;

export type SocialGraphLoaderOptions = Partial<{
  /** An event store to send all the events to */
  eventStore: IEventStore;
  /** The number of parallel requests to make (default 100) */
  parallel: number;
  /** Extra relays to laod from */
  relays?: string[] | Observable<string[]>;
  /** Whether to follow relay hints in contact events */
  hints?: boolean;
}>;

/** Create a social graph loader */
export function socialGraphLoader(
  addressLoader: AddressPointerLoader,
  opts?: SocialGraphLoaderOptions,
): SocialGraphLoader {
  return wrapGeneratorFunction<[ProfilePointer & { distance: number }], NostrEvent>(async function* (user) {
    const seen = new Set<string>();
    const queue: (ProfilePointer & { distance: number })[] = [user];

    // get the relays to load from
    const relays = isObservable(opts?.relays) ? await firstValueFrom(opts?.relays) : opts?.relays;

    // Keep loading while the queue has items
    while (queue.length > 0) {
      const pointer = queue.shift();
      if (!pointer) continue;

      const address: LoadableAddressPointer = {
        kind: kinds.Contacts,
        pubkey: pointer.pubkey,
        relays: opts?.hints ? mergeRelaySets(pointer.relays, relays) : relays,
      };

      // load the contacts events
      const events = yield addressLoader(address).pipe(
        // Pass all events to the store if set
        opts?.eventStore ? mapEventsToStore(opts.eventStore) : identity,
      );
      const contacts = getProfilePointersFromList(events[events.length - 1]);

      // if the distance is greater than 0, add the contacts to the queue
      if (pointer.distance >= 0) {
        for (const contact of contacts) {
          // Dont add any contacts that have already been seen
          if (seen.has(contact.pubkey)) continue;
          seen.add(contact.pubkey);

          // Add to queue
          queue.push({ ...contact, distance: pointer.distance - 1 });
        }
      }
    }
  });
}

const addressLoader = addressPointerLoader(pool.request.bind(pool), { eventStore });
const graphLoader = socialGraphLoader(addressLoader, {
  eventStore,
  relays: ["ws://localhost:4869"],
  hints: false,
});

export default function SocialGraphLoader() {
  const [root, setRoot] = useState<string | null>(() => {
    const url = new URL(window.location.href);
    return url.searchParams.get("root");
  });

  const request$ = useMemo(() => (root ? graphLoader({ pubkey: root, distance: 1 }) : EMPTY), [root]);
  useObservable(request$);

  return (
    <div className="container mx-auto">
      <input className="input input-bordered" value={root || ""} onChange={(e) => setRoot(e.target.value)} />

      <button className="btn btn-primary" onClick={async () => setRoot(await new ExtensionSigner().getPublicKey())}>
        set from extension
      </button>
    </div>
  );
}
