---
name: Demand.js and bookings column names
description: Correct column names for category in bookings and services tables
---

**Rule:** Both `bookings` and `services` tables use `category_slug`, NOT `category`. The demand.js file had queries using `category` which caused `column does not exist` errors.

**How to apply:** When querying bookings or services for category data:
- `bookings.category_slug` (not `bookings.category`)
- `services.category_slug` (not `services.category`)

In GROUP BY clauses: `GROUP BY DATE_TRUNC('hour', created_at), category_slug`
In DISTINCT selects: `SELECT DISTINCT category_slug AS category FROM services`
