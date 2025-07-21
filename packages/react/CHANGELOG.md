# applesauce-react

## 2.1.0

### Patch Changes

- 230e6d2: Fix `useObservableEagerMemo` not returning undefined when return value was undefined
- 230e6d2: Fix `useEventModel` recreating the model every render
- Updated dependencies
  - applesauce-actions@2.1.0
  - applesauce-core@2.1.0

## 2.0.0

### Major Changes

- 1d28426: Rename `useStoreQuery` to `useEventModel`
- 1d28426: Remove query store provider and context

### Minor Changes

- 324b960: Bump `nostr-tools` to 2.13

### Patch Changes

- Updated dependencies
  - applesauce-core@2.0.0
  - applesauce-factory@2.0.0
  - applesauce-accounts@2.0.0
  - applesauce-actions@2.0.0
  - applesauce-content@2.0.0

## 1.0.0

### Patch Changes

- Updated dependencies
  - applesauce-core@1.0.0
  - applesauce-actions@1.0.0
  - applesauce-accounts@1.0.0
  - applesauce-content@1.0.0
  - applesauce-factory@1.0.0

## 0.12.0

### Minor Changes

- dcda34e: Add actions providers and hooks

### Patch Changes

- Updated dependencies
  - applesauce-actions@0.12.0
  - applesauce-core@0.12.0
  - applesauce-accounts@0.12.0
  - applesauce-factory@0.12.0
  - applesauce-content@0.12.0

## 0.11.0

### Minor Changes

- be28870: Add `AccountsProvider` provider
- be28870: Add account manager hooks

### Patch Changes

- 1c35f41: Add `require` support in node v22
- Updated dependencies
  - applesauce-factory@0.11.0
  - applesauce-core@0.11.0
  - applesauce-accounts@0.11.0
  - applesauce-content@0.11.0

## 0.10.0

### Minor Changes

- e43bc1b: Make `QueryStoreProvider` provide event store
- e43bc1b: Add `EventStoreProvider` and `useEventStore`
- 494e934: Add `EventFactoryProvider`

### Patch Changes

- 26264fc: Bump nostr-tools package
- Updated dependencies
  - applesauce-core@0.10.0
  - applesauce-content@0.10.0
  - applesauce-factory@0.10.0

## 0.9.0

### Minor Changes

- 493aee0: Bump nostr-tools to 2.10
- 1c98217: Require `cacheKey` in `useRenderedContent`

### Patch Changes

- 29ff112: Fix useObservable caching previous observable value
- 81015c4: Fix useObservable getting stuck on old values
- Updated dependencies
  - applesauce-core@0.9.0
  - applesauce-content@0.9.0

## 0.8.0

### Minor Changes

- fcde36a: Cleanup exports
- 0dae7f5: Replace zen-observable with rxjs

### Patch Changes

- Updated dependencies
  - applesauce-core@0.8.0
  - applesauce-content@0.8.0

## 0.7.0

### Minor Changes

- 8056e31: Add option for additional transformers
- 848bb02: add `useRenderedContent` hook for rendering text notes
- af6065f: Add `renderNast` helper method
- af6065f: Add `useRenderNast` hook
- af6065f: add `useTextContent` hook

### Patch Changes

- Updated dependencies
  - applesauce-content@0.7.0
  - applesauce-core@0.7.0

## 0.6.0

### Patch Changes

- Updated dependencies
  - applesauce-core@0.6.0
