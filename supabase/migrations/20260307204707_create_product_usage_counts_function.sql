/*
  # Create product usage counts RPC function

  1. New Functions
    - `get_product_usage_counts()` - Returns aggregated product usage counts from outfit_items table
      - Returns `product_id` (uuid) and `usage_count` (bigint)
      - Groups by product_id and counts occurrences
  
  2. Purpose
    - Replaces client-side aggregation of all outfit_items rows
    - Much more efficient: DB does the GROUP BY instead of sending all rows to client
*/

CREATE OR REPLACE FUNCTION get_product_usage_counts()
RETURNS TABLE(product_id uuid, usage_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT product_id, COUNT(*) as usage_count
  FROM outfit_items
  WHERE product_id IS NOT NULL
  GROUP BY product_id;
$$;
