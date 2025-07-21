---
"applesauce-relay": major
---

Update `pool.publish` and `group.publish` to return `Promise<PublishResponse[]>` so `lastValueFrom` does not need to be used.
