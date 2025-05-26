import { unixNow } from "applesauce-core/helpers";
import { SimpleSigner } from "applesauce-signers/signers/simple-signer";
import type { EventTemplate, NostrEvent } from "nostr-tools";
import { finalizeEvent, getPublicKey, kinds } from "nostr-tools";

export class FakeUser extends SimpleSigner {
  pubkey = getPublicKey(this.key);

  event(data?: Partial<EventTemplate>): NostrEvent {
    return finalizeEvent(
      {
        kind: data?.kind ?? kinds.ShortTextNote,
        content: data?.content || "",
        created_at: data?.created_at ?? unixNow(),
        tags: data?.tags || [],
      },
      this.key,
    );
  }

  note(content = "Hello World", extra?: Partial<EventTemplate>) {
    return this.event({ kind: kinds.ShortTextNote, content, ...extra });
  }

  profile(profile: any, extra?: Partial<EventTemplate>) {
    return this.event({ kind: kinds.Metadata, content: JSON.stringify({ ...profile }), ...extra });
  }

  contacts(pubkeys: string[] = []) {
    return this.event({ kind: kinds.Contacts, tags: pubkeys.map((p) => ["p", p]) });
  }
}
