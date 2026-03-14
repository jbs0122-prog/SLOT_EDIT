/*
  # Add batch outfit warmth RPC function

  ## Purpose
  Replaces the N+1 query pattern in AdminOutfitLinker and AdminPins where outfit_items
  were fetched separately per page to compute warmth values.

  ## New Function
  - `get_outfit_warmth_batch(outfit_ids text[])`: takes an array of outfit IDs and
    returns a table of (outfit_id, avg_warmth, item_count) computed from outfit_items
    joined with products in a single DB round-trip.

  ## Logic
  - Clothing slots (outer, mid, top, bottom) weight = 1.0
  - Shoes weight = 0.4
  - Returns NULL avg_warmth when no items are found
*/

CREATE OR REPLACE FUNCTION get_outfit_warmth_batch(outfit_ids text[])
RETURNS TABLE (
  outfit_id text,
  avg_warmth numeric,
  item_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    oi.outfit_id,
    CASE
      WHEN SUM(
        CASE
          WHEN p.category IN ('outer','mid','top','bottom') THEN 1.0
          WHEN p.category = 'shoes' THEN 0.4
          ELSE 0
        END
      ) > 0
      THEN SUM(
        CASE
          WHEN p.category IN ('outer','mid','top','bottom') THEN p.warmth * 1.0
          WHEN p.category = 'shoes' THEN p.warmth * 0.4
          ELSE 0
        END
      ) / SUM(
        CASE
          WHEN p.category IN ('outer','mid','top','bottom') THEN 1.0
          WHEN p.category = 'shoes' THEN 0.4
          ELSE 0
        END
      )
      ELSE NULL
    END AS avg_warmth,
    COUNT(oi.id)::integer AS item_count
  FROM outfit_items oi
  JOIN products p ON p.id = oi.product_id
  WHERE oi.outfit_id = ANY(outfit_ids)
  GROUP BY oi.outfit_id;
$$;

GRANT EXECUTE ON FUNCTION get_outfit_warmth_batch(text[]) TO anon, authenticated;
