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
        text: "Core",
        items: [
          { text: "Events", link: "/core/events" },
          { text: "Helpers", link: "/core/helpers" },
          { text: "Models", link: "/core/models" },
          { text: "Factory", link: "/core/factory" },
          { text: "Actions", link: "/core/actions" },
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
          { text: "Providers", link: "/react/providers" },
          { text: "Hooks", link: "/react/hooks" },
        ],
      },
      {
        text: "Wallet",
        items: [
          { text: "Package", link: "/wallet/package" },
          { text: "Actions", link: "/wallet/actions" },
          { text: "Queries", link: "/wallet/queries" },
        ],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/hzrd149/applesauce" }],
  },
});
