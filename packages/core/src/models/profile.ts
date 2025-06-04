import { kinds } from "nostr-tools";
import { filter, map } from "rxjs/operators";

import { Model } from "../event-store/interface.js";
import { getProfileContent, isValidProfile, ProfileContent } from "../helpers/profile.js";
import { withImmediateValueOrDefault } from "../observable/with-immediate-value.js";

/** A model that gets and parses the kind 0 metadata for a pubkey */
export function ProfileModel(pubkey: string): Model<ProfileContent | undefined> {
  return (events) =>
    events.replaceable(kinds.Metadata, pubkey).pipe(
      // Filter out invalid profile events
      filter(isValidProfile),
      // Parse the profile event into a ProfileContent
      map((event) => event && getProfileContent(event)),
      // Ensure the model is synchronous
      withImmediateValueOrDefault(undefined),
    );
}
