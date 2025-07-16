---
"applesauce-relay": major
---

Update `relay.authenticate` to return `Promise<PublishResponse>` so `lastValueFrom` does not need to be used.
