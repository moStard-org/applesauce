# applesauce-relay

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
