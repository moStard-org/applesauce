import { Rumor } from "./gift-wraps.js";
import { isPTag } from "./tags.js";

/**
 * Retruns the conversation identifier for a wrapped direct message
 * @param self - The pubkey of the user receiving the message
 */
export function getConversationIdentifier(self: string, message: Rumor): string {
  return `${self}-${message.tags
    .filter(isPTag)
    .map((t) => t[1])
    .join(":")}`;
}
