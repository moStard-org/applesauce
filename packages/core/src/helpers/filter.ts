import equal from "fast-deep-equal";
import { Filter, NostrEvent } from "nostr-tools";
import { getIndexableTags } from "./event-tags.js";

/**
 * Copied from nostr-tools and modified to use getIndexableTags
 * @see https://github.com/nbd-wtf/nostr-tools/blob/a61cde77eacc9518001f11d7f67f1a50ae05fd80/filter.ts
 */
export function matchFilter(filter: Filter, event: NostrEvent): boolean {
	if (filter.ids && filter.ids.indexOf(event.id) === -1) {
		return false;
	}
	if (filter.kinds && filter.kinds.indexOf(event.kind) === -1) {
		return false;
	}
	if (filter.authors && filter.authors.indexOf(event.pubkey) === -1) {
		return false;
	}

	for (let f in filter) {
		if (f[0] === "#") {
			let tagName = f.slice(1);
			let values = filter[f as `#${string}`];
			if (values) {
				const tags = getIndexableTags(event);
				if (values.some((v) => tags.has(tagName + ":" + v)) === false)
					return false;
			}
		}
	}

	if (filter.since && event.created_at < filter.since) return false;
	if (filter.until && event.created_at > filter.until) return false;

	return true;
}

/** Copied from nostr-tools */
export function matchFilters(filters: Filter[], event: NostrEvent): boolean {
	for (let i = 0; i < filters.length; i++) {
		if (matchFilter(filters[i], event)) {
			return true;
		}
	}
	return false;
}

/** Copied from nostr-tools and modified to support undefined  */
export function mergeFilters(...filters: Filter[]): Filter {
	const result: Filter = {};

	for (let i = 0; i < filters.length; i++) {
		const filter = filters[i];
		for (const [property, values] of Object.entries(filter)) {
			// skip undefined
			if (values === undefined) continue;

			if (
				property === "kinds" ||
				property === "ids" ||
				property === "authors" ||
				property[0] === "#"
			) {
				// @ts-ignore
				result[property] = filter[property] || [];

				if (Array.isArray(values))
					for (let v = 0; v < values.length; v++) {
						const value = values[v];
						// @ts-ignore
						if (!result[property].includes(value)) result[property].push(value);
					}
			}
		}

		if (filter.limit && (!result.limit || filter.limit > result.limit))
			result.limit = filter.limit;
		if (filter.until && (!result.until || filter.until > result.until))
			result.until = filter.until;
		if (filter.since && (!result.since || filter.since < result.since))
			result.since = filter.since;
	}

	return result;
}

/** Check if two filters are equal */
export function isFilterEqual(a: Filter | Filter[], b: Filter | Filter[]) {
	return equal(a, b);
}
