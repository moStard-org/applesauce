---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "AppleSauce"
  text: "Modular SDK for Nostr"
  tagline: Build reactive nostr UI with less code
  actions:
    - theme: brand
      text: Getting Started
      link: /introduction/getting-started
    - theme: alt
      text: Reference
      link: /typedoc/index.html
    - theme: alt
      text: Examples
      link: /examples/

features:
  - title: Utilities
    details: At its core AppleSauce is packages of helper methods to help parse and understand nostr events.
  - title: Reactive
    details: AppleSauce is built using RxJS observables, which makes subscribing to events and filters simple.
  - title: Modular
    details: Every piece of the packages can be used independently, helpers, event store, and signers.
  - title: Flexible
    details: Easily request events from relays without making connection state. or use any other nostr library to talk to relays.
---
