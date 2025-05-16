import { ISyncEventStore, logger } from "applesauce-core";
import { map, share, firstValueFrom } from "rxjs";
import { Filter } from "nostr-tools";
import { nanoid } from "nanoid";

import { MultiplexWebSocket } from "./types.js";
import { Negentropy, NegentropyStorageVector } from "./lib/negentropy.js";

const log = logger.extend("negentropy");

export function buildStorageFromFilter(store: ISyncEventStore, filter: Filter): NegentropyStorageVector {
  const storage = new NegentropyStorageVector();
  for (const event of store.getAll(filter)) storage.insert(event.created_at, event.id);
  storage.seal();
  return storage;
}

export function buildStorageVector(items: { id: string; created_at: number }[]): NegentropyStorageVector {
  const storage = new NegentropyStorageVector();
  for (const item of items) storage.insert(item.created_at, item.id);
  storage.seal();
  return storage;
}

export async function negentropySync(
  storage: NegentropyStorageVector,
  socket: MultiplexWebSocket & { next: (msg: any) => void },
  filter: Filter,
  reconcile: (have: string[], need: string[]) => Promise<void>,
  opts?: { frameSizeLimit?: number; signal?: AbortSignal },
): Promise<boolean> {
  let id = nanoid();
  let ne = new Negentropy(storage, opts?.frameSizeLimit);

  let initialMessage = await ne.initiate<string>();
  let msg: string | null = initialMessage;

  const incoming = socket
    .multiplex(
      // Start by sending the NEG-OPEN with initial message
      () => {
        log("Sending initial message", id, filter, initialMessage);
        return ["NEG-OPEN", id, filter, initialMessage];
      },
      // Close with NEG-CLOSE
      () => {
        log("Closing sync", id);
        return ["NEG-CLOSE", id];
      },
      // Look for NEG-MSG and NEG-ERR messages that match the id
      (m) => {
        return (m[0] === "NEG-MSG" || m[0] === "NEG-ERR") && m[1] === id;
      },
    )
    .pipe(
      // If error, throw
      map((msg) => {
        if (msg[0] === "NEG-ERR") throw new Error(msg[2]);
        return msg[2] as string;
      }),
      share(),
    );

  // keep an additional subscription open while waiting for async operations
  const sub = incoming.subscribe((m) => console.log(m));
  try {
    while (msg && opts?.signal?.aborted !== true) {
      const received = await firstValueFrom(incoming);
      if (opts?.signal?.aborted) return false;

      const [newMsg, have, need] = await ne.reconcile<string>(received);

      await reconcile(have, need);

      msg = newMsg;
    }
  } catch (err) {
    sub.unsubscribe();
    throw err;
  } finally {
    sub.unsubscribe();
  }

  return true;
}
