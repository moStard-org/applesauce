import { Transformer, unified } from "unified";
import { EventTemplate, NostrEvent } from "nostr-tools";
import { getOrComputeCachedValue } from "applesauce-core/helpers/cache";

import { nostrMentions } from "./mentions.js";
import { emojis } from "./emoji.js";
import { createTextNoteATS } from "./parser.js";
import { Root } from "../nast/types.js";
import { hashtags } from "./hashtag.js";
import { galleries } from "./gallery.js";
import { eolMetadata } from "../nast/eol-metadata.js";
import { links } from "./links.js";

export const TextNoteContentSymbol = Symbol.for("text-note-content");

// default kind 1 transformers
export const textNoteTransformers = [
	links,
	nostrMentions,
	galleries,
	emojis,
	hashtags,
	eolMetadata,
];

/** Parsed and process a note with custom transformers */
export function getParsedContent(
	event: NostrEvent | EventTemplate | string,
	content?: string,
	transformers: (() => Transformer<Root>)[] = textNoteTransformers,
	cacheKey: symbol | null | undefined = TextNoteContentSymbol,
) {
	// process strings
	if (typeof event === "string") {
		const processor = unified();
		for (const transformer of transformers) {
			processor.use(transformer);
		}
		return processor.runSync(createTextNoteATS(event, content)) as Root;
	}

	// no caching
	if (!cacheKey) {
		const processor = unified();
		for (const transformer of transformers) {
			processor.use(transformer);
		}
		return processor.runSync(createTextNoteATS(event, content)) as Root;
	}

	return getOrComputeCachedValue(event, cacheKey, () => {
		const processor = unified();
		for (const transformer of transformers) {
			processor.use(transformer);
		}
		return processor.runSync(createTextNoteATS(event, content)) as Root;
	});
}

export function removeParsedTextContent(event: NostrEvent | EventTemplate) {
	// @ts-expect-error
	delete event[TextNoteContentSymbol];
}
