import { map } from "rxjs/operators";

import { Model } from "../event-store/interface.js";
import { BLOSSOM_SERVER_LIST_KIND, getBlossomServersFromList } from "../helpers/blossom.js";

/** A model that returns a users blossom servers */
export function UserBlossomServersModel(pubkey: string): Model<URL[]> {
  return (store) =>
    store
      .replaceable(BLOSSOM_SERVER_LIST_KIND, pubkey)
      .pipe(map((event) => (event ? getBlossomServersFromList(event) : [])));
}
