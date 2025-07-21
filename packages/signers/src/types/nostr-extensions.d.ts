import { ISigner } from "../interface.ts";

declare global {
  interface Window {
    nostr?: ISigner;
  }
}
