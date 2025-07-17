import { EventFactory } from "applesauce-factory";
import { defer, from, ignoreElements, merge, Observable, switchMap } from "rxjs";
import { Filter, NostrEvent } from "nostr-tools";

import { MachineRequestBlueprint } from "./blueprints/machine-request.js";
import { RequestInput } from "./helpers/request.js";
import { DVM_REQUEST_KINDS, DVM_STATUS_KIND } from "./helpers/kinds.js";
import { logger } from "applesauce-core";

export type PublishMethod = (relays: string[], event: NostrEvent) => Promise<void>;
export type SubscriptionMethod = (relays: string[], filters: Filter[]) => Observable<NostrEvent>;

export class DVMClient {
  protected log = logger.extend("DVMClient");

  constructor(
    public factory: EventFactory,
    public relays: string[],
    public publish: PublishMethod,
    public subscribe: SubscriptionMethod,
  ) {}

  /**
   * Makes a request to the DVM and returns an observable for the responses
   * @param kind - The kind of request to send
   * @param options - The options for the request
   * @returns An observable for the responses
   */
  request(
    kind: number,
    options?: {
      /** Inputs for this request */
      inputs?: RequestInput[];
      /** A directory of parameters for the request */
      params?: Record<string, string | string[]>;
      /** The specific relays to use for this request */
      relays?: string[];
      /** The DVMs to tag for this request */
      dvms?: string[];
    },
  ): Observable<NostrEvent> {
    const relays = options?.relays || this.relays;

    return from(
      this.factory.create(MachineRequestBlueprint, kind, {
        ...options,
        relays,
      }),
    ).pipe(
      // Sign the request
      switchMap((draft) => from(this.factory.sign(draft))),
      // Send the request and listen for responses
      switchMap((request) => {
        this.log(`Sending request ${request.id} to ${relays.length} relays`);

        return merge(
          // Publish the request event to the relays
          defer(() => this.publish(relays, request)).pipe(ignoreElements()),
          // Subscribe for responses
          this.subscribe(relays, [{ kinds: [request.kind + 1000, DVM_STATUS_KIND], "#e": [request.id] }]),
        );
      }),
    );
  }

  /** Make a translation request to a target language */
  translate(text: string | NostrEvent, language: string = "en") {
    return this.request(DVM_REQUEST_KINDS.TRANSLATION, {
      inputs: [typeof text === "string" ? { type: "text", text } : { type: "event", event: text.id }],
      params: { language },
    });
  }
}
