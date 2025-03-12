import { Token } from "@cashu/cashu-ts";
import { EventBlueprint, EventFactory } from "applesauce-factory";
import { WALLET_TOKEN_KIND } from "../helpers/tokens.js";
import { setTokenContent } from "../operations/event/tokens.js";

/**
 * A blueprint for a wallet token event, takes a cashu token and previous deleted token event ids
 * @param token the cashu token to store
 * @param [del=[]] an array of previous token event ids that are deleted
 */
export function WalletTokenBlueprint(token: Token, del: string[] = []): EventBlueprint {
  return (ctx) => EventFactory.runProcess({ kind: WALLET_TOKEN_KIND }, ctx, setTokenContent(token, del));
}
