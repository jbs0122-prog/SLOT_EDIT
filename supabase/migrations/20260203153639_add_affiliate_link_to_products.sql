/*
  # Add affiliate_link column to products table

  1. Changes
    - Add `affiliate_link` column to products table
      - Stores Amazon Associates affiliate link
      - Optional field (can be empty for non-affiliate products)
      - Text type for full URL storage

  2. Notes
    - This supports Phase 1: Manual affiliate link management
    - Admins will paste Amazon Associates links directly
    - No Amazon API required at this stage
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'affiliate_link'
  ) THEN
    ALTER TABLE products ADD COLUMN affiliate_link text DEFAULT '';
  END IF;
END $$;