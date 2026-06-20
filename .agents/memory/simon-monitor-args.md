---
name: Simon writeSimonMemory argument order
description: The correct argument order for writeSimonMemory in db.js
---

**Rule:** `writeSimonMemory(key, value, confidence, sourceAgent, ttlHours)` — confidence comes BEFORE sourceAgent, ttlHours is last.

**Why:** monitor.js originally called it as `(key, value, 24, 80, 'monitor')` which put the string `'monitor'` into ttlHours, causing `new Date(Date.now() + 'monitor' * ...)` = NaN timestamp that crashed on every zone_supply_tracking job.

**How to apply:** Any new call to writeSimonMemory must follow:
```js
await writeSimonMemory(key, value, 80 /* confidence */, 'monitor' /* sourceAgent */, 24 /* ttlHours */);
```
