import { kinds } from "nostr-tools";
import {
  catchError,
  combineLatest,
  distinct,
  EMPTY,
  filter,
  isObservable,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
} from "rxjs";
import { IEventStoreStreams } from "../event-store/interface.js";
import { logger } from "../logger.js";
import {
  canHaveEncryptedContent,
  getEncryptedContent,
  isEncryptedContentLocked,
  setEncryptedContentCache,
} from "./encrypted-content.js";
import { notifyEventUpdate } from "./event.js";
import { getGiftWrapSeal } from "./gift-wraps.js";

/** A symbol that is used to mark encrypted content as being from a cache */
export const EncryptedContentFromCacheSymbol = Symbol.for("encrypted-content-from-cache");

/** An interface that is used to cache encrypted content on events */
export interface EncryptedContentCache {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<any>;
}

/** Marks the encrypted content as being from a cache */
export function markEncryptedContentFromCache<T extends object>(event: T) {
  Reflect.set(event, EncryptedContentFromCacheSymbol, true);
}

/** Checks if the encrypted content is from a cache */
export function isEncryptedContentFromCache<T extends object>(event: T): boolean {
  return Reflect.has(event, EncryptedContentFromCacheSymbol);
}

const log = logger.extend("EncryptedContentCache");

/** Starts a process that persists and restores all encrypted content */
export function persistEncryptedContent(
  eventStore: IEventStoreStreams,
  storage: EncryptedContentCache | Observable<EncryptedContentCache>,
): () => void {
  const storage$ = isObservable(storage) ? storage : of(storage);

  // Restore encrypted content when it is inserted
  const restore = eventStore.insert$
    .pipe(
      // Look for events that support encrypted content and are locked
      filter((e) => canHaveEncryptedContent(e.kind) && isEncryptedContentLocked(e)),
      // Get the encrypted content from storage
      mergeMap((event) =>
        // Wait for storage to be available
        storage$.pipe(
          switchMap((storage) => combineLatest([of(event), storage.getItem(event.id)])),
          catchError((error) => {
            log(`Failed to restore encrypted content for ${event.id}`, error);
            return EMPTY;
          }),
        ),
      ),
    )
    .subscribe(async ([event, content]) => {
      if (!content) return;

      // Restore the encrypted content and set it as from a cache
      markEncryptedContentFromCache(event);
      setEncryptedContentCache(event, content);

      log(`Restored encrypted content for ${event.id}`);
    });

  // Restore seals when they are unlocked
  const restoreSeals = eventStore.update$
    .pipe(
      // Look for gift wraps that are unlocked
      filter((e) => e.kind === kinds.GiftWrap && !isEncryptedContentLocked(e)),
      // Get the seal event
      map((gift) => [gift, getGiftWrapSeal(gift)] as const),
      // Look for gift wraps with locked seals
      filter(([_gift, seal]) => seal !== undefined && isEncryptedContentLocked(seal)),
      // Only attempt to unlock seals once
      distinct(([_gift, seal]) => seal!.id),
      // Get encrypted content from storage
      mergeMap(([gift, seal]) =>
        // Wait for storage to be available
        storage$.pipe(
          switchMap((storage) => combineLatest([of(gift), of(seal), storage.getItem(seal!.id)])),
          catchError((error) => {
            log(`Failed to restore encrypted content for ${seal!.id}`, error);
            return EMPTY;
          }),
        ),
      ),
    )
    .subscribe(async ([gift, seal, content]) => {
      if (!seal || !content) return;

      markEncryptedContentFromCache(seal);
      setEncryptedContentCache(seal, content);

      // Trigger an update to the gift wrap event
      notifyEventUpdate(gift);

      log(`Restored encrypted content for ${seal.id}`);
    });

  // Persist encrypted content when it is updated
  const persist = combineLatest([eventStore.update$, storage$])
    .pipe(
      // Look for events that support encrypted content and are unlocked and not from the cache
      filter(
        ([event]) =>
          canHaveEncryptedContent(event.kind) &&
          !isEncryptedContentLocked(event) &&
          !isEncryptedContentFromCache(event),
      ),
      // Only persist the encrypted content once
      distinct(([event]) => event.id),
    )
    .subscribe(async ([event, storage]) => {
      try {
        const content = getEncryptedContent(event);
        if (content) {
          await storage.setItem(event.id, content);
          log(`Persisted encrypted content for ${event.id}`);
        }
      } catch (error) {
        // Ignore errors when saving encrypted content
        log(`Failed to persist encrypted content for ${event.id}`, error);
      }
    });

  // Persist seals when they are unlocked
  // This relies on the gift wrap event being updated when a seal is unlocked
  const persistSeals = combineLatest([eventStore.update$, storage$])
    .pipe(
      // Look for gift wraps that are unlocked
      filter(([event]) => event.kind === kinds.GiftWrap && !isEncryptedContentLocked(event)),
      // Get the seal event
      map(([gift, storage]) => [gift, getGiftWrapSeal(gift), storage] as const),
      // Make sure the seal is defined
      filter(([_gift, seal]) => seal !== undefined),
      // Make sure seal is unlocked and not from cache
      filter(([_gift, seal]) => !isEncryptedContentLocked(seal!) && !isEncryptedContentFromCache(seal!)),
      // Only persist the seal once
      distinct(([seal]) => seal!.id),
    )
    .subscribe(async ([_gift, seal, storage]) => {
      if (!seal) return;
      try {
        const content = getEncryptedContent(seal!);
        if (content) {
          await storage.setItem(seal!.id, content);
          log(`Persisted encrypted content for ${seal!.id}`);
        }
      } catch (error) {
        // Ignore errors when saving encrypted content
        log(`Failed to persist encrypted content for ${seal.id}`, error);
      }
    });

  return () => {
    restore.unsubscribe();
    persist.unsubscribe();
    restoreSeals.unsubscribe();
    persistSeals.unsubscribe();
  };
}
