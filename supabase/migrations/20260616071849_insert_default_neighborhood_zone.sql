/*
# Insert default neighborhood zone

This migration inserts a default neighborhood zone so that other features
like skill_swaps and group_buys can reference it.

## Changes:
- Insert a default zone if none exists
*/

INSERT INTO neighborhood_zones (name, city, country, center_lat, center_lng, active_member_count)
VALUES ('Default Neighborhood', 'Local', 'PK', 25.0, 67.0, 0)
ON CONFLICT DO NOTHING;