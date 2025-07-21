import { type DecodeResult } from "applesauce-core/helpers";
import { type EventTemplate, type NostrEvent } from "nostr-tools";
import { type Parent, type Node as UnistNode } from "unist";

export interface CommonData {
	eol?: boolean;
}

export interface Node extends Omit<UnistNode, "data"> {
	data?: CommonData;
}

export interface Text extends Node {
	type: "text";
	value: string;
}

export interface Link extends Node {
	type: "link";
	value: string;
	href: string;
}

export interface Gallery extends Node {
	type: "gallery";
	links: string[];
}

export interface Mention extends Node {
	type: "mention";
	decoded: DecodeResult;
	encoded: string;
}

export interface Hashtag extends Node {
	type: "hashtag";
	/** The name as it was written in the event */
	name: string;
	/** The lowercase canonical name */
	hashtag: string;
	/** The indexable tag for the hashtag. will be undefined if none was found */
	tag?: ["t", ...string[]];
}

export interface Emoji extends Node {
	type: "emoji";
	code: string;
	raw: string;
	url: string;
	tag: ["emoji", ...string[]];
}

export interface ContentMap {
	text: Text;
	link: Link;
	mention: Mention;
	hashtag: Hashtag;
	emoji: Emoji;
	gallery: Gallery;
}

export type Content = ContentMap[keyof ContentMap];

export interface Root extends Parent {
	type: "root";
	children: Content[];
	event?: NostrEvent | EventTemplate;
	truncated?: boolean;
}
