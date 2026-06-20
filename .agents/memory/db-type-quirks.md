---
name: DB column type quirks
description: Key JOIN type mismatches between UUID and TEXT columns across tables
---

**Rule:** When joining `provider_presence`, `provider_trust_scores`, or any FK that references users by provider_id, always cast both sides to `::text` because those tables store provider_id as TEXT while `users.id` and `providers.user_id` are UUID.

**Why:** PostgreSQL has no implicit TEXT=UUID coercion. Without a cast the query throws `operator does not exist: text = uuid` (error code 42883).

**How to apply:** Any new query joining these tables:
```sql
LEFT JOIN provider_trust_scores pts ON pts.provider_id::text = p.user_id::text
LEFT JOIN provider_presence pp ON pp.provider_id::text = p.user_id::text
```

Also applies to `reviews` table: `reviews.provider_id` is TEXT, `users.id` is UUID — cast when comparing.
