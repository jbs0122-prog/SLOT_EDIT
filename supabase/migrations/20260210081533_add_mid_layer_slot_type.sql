/*
  # Add 'mid' (mid-layer) slot type for layering support

  1. Purpose
    - Enable shirt-under-knit layering (e.g., shirt + knit sweater)
    - New slot hierarchy: outer > mid > top > bottom > shoes > bag > accessory
    - 'mid' holds knits, cardigans, sweaters, vests worn over a base top layer

  2. Slot Type Reference (updated)
    - outer: coats, puffers, jackets, trench coats
    - mid: knits, cardigans, sweaters, vests, fleece (NEW)
    - top: shirts, t-shirts, base layer tops
    - bottom: pants, skirts, shorts
    - shoes: all footwear
    - bag: bags and carriers
    - accessory: belts, caps, scarves, watches

  3. Seasonal Layering Guide
    - Summer (warmth 1-2): top only
    - Spring/Fall (warmth 3): top + mid OR top + outer
    - Cold (warmth 4): top + mid + outer
    - Winter (warmth 5): top + mid + outer

  4. Schema Impact
    - products.category: text field, now accepts 'mid' as valid value
    - outfit_items.slot_type: text field, now accepts 'mid' as valid value
    - No CHECK constraints exist on these columns, so no DDL changes needed

  5. Important Notes
    - No data loss or destructive operations
    - Existing products and outfit_items remain unchanged
    - New 'mid' category products can be created immediately after this migration
*/

-- This migration is documentation-only.
-- The products.category and outfit_items.slot_type columns are plain text
-- with no CHECK constraints, so 'mid' is already a valid value.
-- This migration serves as an audit trail for the schema change.

SELECT 1;
