/*
  # Add look_affinity column to products table

  1. Modified Tables
    - `products`
      - `look_affinity` (jsonb, nullable) - Stores soft affinity scores (0-100) 
        for each vibe + look combination.
        Format: { "ELEVATED_COOL": { "A": 85, "B": 30, "C": 70 }, ... }
        This enables the matching engine to prefer products suited 
        for specific looks within a vibe, improving outfit diversity 
        and precision.

  2. Important Notes
    - Column is nullable so existing products continue to work
    - No RLS changes needed (existing policies cover all columns)
    - Index on look_affinity is not needed since we only read it 
      after products are already filtered
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'look_affinity'
  ) THEN
    ALTER TABLE products ADD COLUMN look_affinity jsonb;
  END IF;
END $$;
