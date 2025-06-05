import { Rumor } from "./gift-wraps.js";
import { getTagValue } from "./index.js";
import { isPTag } from "./tags.js";

/**
 * Returns all pubkeys of participants of a conversation
 * @param participants - The conversation identifier (pubkey1:pubkey2:pubkey3), or a users pubkey, or a list of participant pubkeys, or a rumor message
 * @returns The participants of the conversation
 */
export function getConversationParticipants(participants: string | string[] | Rumor): string[] {
  return Array.from(
    new Set(
      typeof participants === "string"
        ? participants.split(":")
        : Array.isArray(participants)
          ? participants
          : [participants.pubkey, ...participants.tags.filter(isPTag).map((t) => t[1])],
    ),
  );
}

/**
 * Creates a conversation identifier from a users pubkey and alist of correspondants
 * @param participants - The participants of the conversation
 * @returns The conversation identifier
 */
export function createConversationIdentifier(participants: string[]): string {
  return Array.from(new Set(participants)).sort().join(":");
}

/**
 * Returns the conversation identifier for a wrapped direct message
 * @param message - The message to get the conversation identifier for
 * @returns The conversation identifier
 */
export function getConversationIdentifierFromMessage(message: Rumor): string {
  return createConversationIdentifier(getConversationParticipants(message));
}

/** Returns the subject of a warpped direct message */
export function getWrappedMessageSubject(message: Rumor): string | undefined {
  return getTagValue(message, "subject");
}

/** Returns the parent id of a wrapped direct message */
export function getWrappedMessageParent(message: Rumor): string | undefined {
  return getTagValue(message, "e");
}
