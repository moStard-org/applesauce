import { subscribeSpyTo } from "@hirez_io/observer-spy";
import { NostrEvent } from "nostr-tools";

import { beforeEach, describe, expect, it } from "vitest";
import { FakeUser } from "../../__tests__/fixtures.js";
import { EventStore } from "../../event-store/event-store.js";
import { getReplaceableIdentifier } from "../../helpers/event.js";
import { QueryStore } from "../../query-store/query-store.js";
import { CommentsQuery } from "../comments.js";

const user = new FakeUser();

let eventStore: EventStore;
let queryStore: QueryStore;

beforeEach(() => {
  eventStore = new EventStore();
  queryStore = new QueryStore(eventStore);
});

describe("CommentsQuery", () => {
  it("should return all comments for newer versions of a replaceable event", () => {
    let article: NostrEvent = user.event({
      kind: 30023,
      content: "# Article",
      tags: [["d", "article-id"]],
    });

    let comment = user.event({
      kind: 1111,
      content: "Comment",
      tags: [
        ["e", article.id],
        ["k", String(article.kind)],
        ["a", getReplaceableIdentifier(article)],
        ["E", article.id],
        ["K", String(article.kind)],
        ["A", getReplaceableIdentifier(article)],
      ],
    });

    eventStore.add(article);
    eventStore.add(comment);

    const spy = subscribeSpyTo(queryStore.createQuery(CommentsQuery, article));

    expect(spy.getValueAt(0)).toEqual([comment]);
  });
});
