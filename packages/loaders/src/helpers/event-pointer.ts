/** deduplicates an array of event pointers and merges their relays array */
export function consolidateEventPointers<T extends { id: string; relays?: string[] }>(pointers: T[]): T[] {
  let ids = new Map<string, T>();

  for (let pointer of pointers) {
    let existing = ids.get(pointer.id);

    // merge relays
    if (existing && pointer.relays) {
      if (!existing.relays) existing.relays = [...pointer.relays];
      // TODO: maybe use mergeRelaySets here if its performant enough
      else existing.relays = [...existing.relays, ...pointer.relays.filter((r) => !existing.relays!.includes(r))];
    } else if (!existing) {
      ids.set(pointer.id, { ...pointer });
    }
  }

  return Array.from(ids.values());
}
