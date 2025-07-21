import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "applesauce",
  description: "Utilities for nostr apps",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Examples", link: "https://hzrd149.github.io/applesauce/examples" },
      { text: "Reference", link: "https://hzrd149.github.io/applesauce/typedoc/index.html" },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "Getting Started", link: "/introduction/getting-started" },
          { text: "Packages", link: "/introduction/packages" },
          { text: "Glossary", link: "/introduction/glossary" },
        ],
      },
      {
        text: "Tutorial",
        items: [
          { text: "Introduction", link: "/tutorial/00-introduction" },
          { text: "The Event Store", link: "/tutorial/01-event-store" },
          { text: "Helper Methods", link: "/tutorial/02-helpers" },
          { text: "Using Models", link: "/tutorial/03-models" },
          { text: "Connecting to Relays", link: "/tutorial/04-relays" },
          { text: "Using Loaders", link: "/tutorial/05-loaders" },
          { text: "Creating Events", link: "/tutorial/06-event-factory" },
          { text: "Publishing Events", link: "/tutorial/07-publishing" },
          { text: "Using Actions", link: "/tutorial/08-actions" },
        ],
      },
      {
        text: "Core",
        items: [
          { text: "Event Store", link: "/core/event-store" },
          { text: "Models", link: "/core/models" },
          { text: "Helpers", link: "/core/helpers" },
        ],
      },
      {
        text: "Relays",
        items: [
          { text: "Package", link: "/relays/package" },
          { text: "Relays", link: "/relays/relays" },
          { text: "Relay Pool", link: "/relays/pool" },
          { text: "Operators", link: "/relays/operators" },
        ],
      },
      {
        text: "Loaders",
        items: [
          { text: "Package", link: "/loaders/package" },
          { text: "Event Loader", link: "/loaders/event-loader" },
          { text: "Address Loader", link: "/loaders/address-loader" },
          { text: "Timeline Loader", link: "/loaders/timeline-loader" },
          { text: "Tag Value Loader", link: "/loaders/tag-value-loader" },
          { text: "Zaps Loader", link: "/loaders/zaps-loader" },
          { text: "Reactions Loader", link: "/loaders/reactions-loader" },
        ],
      },
      {
        text: "Factory",
        items: [
          { text: "Package", link: "/factory/package" },
          { text: "Event Factory", link: "/factory/event-factory" },
          { text: "Event Operations", link: "/factory/event-operations" },
          { text: "Tag Operations", link: "/factory/tag-operations" },
          { text: "Blueprints", link: "/factory/blueprints" },
        ],
      },
      {
        text: "Accounts",
        items: [
          { text: "Package", link: "/accounts/package" },
          { text: "Manager", link: "/accounts/manager" },
          { text: "Accounts", link: "/accounts/accounts" },
        ],
      },
      {
        text: "Signers",
        items: [
          { text: "Package", link: "/signers/package" },
          { text: "Signers", link: "/signers/signers" },
          { text: "Nostr Connect", link: "/signers/nostr-connect" },
        ],
      },
      {
        text: "Actions",
        items: [
          { text: "Package", link: "/actions/package" },
          { text: "Action Hub", link: "/actions/action-hub" },
          { text: "Actions", link: "/actions/actions" },
        ],
      },
      {
        text: "Content",
        items: [
          { text: "Package", link: "/content/package" },
          { text: "Text", link: "/content/text" },
          { text: "Markdown", link: "/content/markdown" },
        ],
      },
      {
        text: "React",
        items: [
          { text: "Package", link: "/react/package" },
          { text: "Hooks", link: "/react/hooks" },
        ],
      },
      {
        text: "Wallet",
        items: [
          { text: "Package", link: "/wallet/package" },
          { text: "Actions", link: "/wallet/actions" },
          { text: "Models", link: "/wallet/models" },
        ],
      },
      {
        text: "Migration",
        items: [{ text: "v1 to v2", link: "/migration/v1-v2" }],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/hzrd149/applesauce" }],
  },
});
