import { ProfileContent, safeParse } from "applesauce-core/helpers";
import { EventOperation } from "../../types.js";
import { setContent } from "./content.js";

/** Sets the content of a kind 0 metadata event */
export function setProfileContent(content: ProfileContent): EventOperation {
  return setContent(JSON.stringify(content));
}

/** Updates the content of a kind 0 metadata event */
export function updateProfileContent(content: Partial<ProfileContent>): EventOperation {
  return (draft) => {
    const existing = safeParse<ProfileContent>(draft.content) || {};
    return { ...draft, content: JSON.stringify({ ...existing, ...content }) };
  };
}
