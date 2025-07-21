# applesauce-relay

## 2.3.0

### Minor Changes

- d638591: Expose `authRequiredForPublish` and `authRequiredForRead` observables on `Relay`
- 3f6dbb0: Add `Relay.authenticationResponse` to expose last AUTH response

### Patch Changes

- Updated dependencies
  - applesauce-core@2.3.0

## 2.1.1

### Patch Changes

- b446dd1: Fix bug with fetching NIP-11 document using wss URL

## 2.0.0

### Minor Changes

- 324b960: Bump `nostr-tools` to 2.13

### Patch Changes

- f8d833e: Fix bug with NIP-11 `auth_required` preventing connection
- d52d39a: Fix `toEventStore` not removing duplicate events
- Updated dependencies
  - applesauce-core@2.0.0

## 1.2.0

### Minor Changes

- 466cd6e: Allow `.req`, `.request`, and `.subscription` to take `filters` as an observable so they can be updated

### Patch Changes

- 63ed560: Normalize relay url to prevent duplicates
- Updated dependencies
  - applesauce-core@1.2.0

## 1.1.0

### Minor Changes

- ed0737a: Add `RelayPool.relays# applesauce-relay and `RelayPool.groups# applesauce-relay observables
- 589f7a2: Change type of `pool.publish` to be single results instead of an array
- 6b9e4cd: Add `RelayPool.blacklist` set
- 73f06ba: Add `Relay.notice# applesauce-relay observable

### Patch Changes

- 73f06ba: Make `Relay.message# applesauce-relay not trigger a connection

## 1.0.1

### Patch Changes

- e0f618b: Fix multiple `REQ` messages

## 1.0.0

### Minor Changes

- 829a041: Fetch relay NIP-11 document
- e81bc36: Add inclusive flag to `completeOnEose` operator
- a5d397b: Add client side negentropy sync
- f406837: Add reconnection logic
- cf4f4db: Add keepAlive timeout no relay (default 30s)
- 829a041: Support NIP-11 `auth_required` limitation
- f406837: Add `publish`, `subscription` and `request` methods to `Relay`, `RelayGroup` and `RelayPool`
- 2d07de6: Add `RelayGroup` class
- 778fcab: Add tests for `Relay`, `RelayGroup`, and `RelayPool`
- e81bc36: Add `toEventStore` operator

### Patch Changes

- 2d07de6: Fix reconnect bug with Relay class
- Updated dependencies
  - applesauce-core@1.0.0

## 0.12.0

### Patch Changes

- Updated dependencies
  - applesauce-core@0.12.0
