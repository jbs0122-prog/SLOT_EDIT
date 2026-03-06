/*
  # Add asin column to products table

  ## Summary
  Adds a dedicated `asin` column to the products table for fast, indexed Amazon ASIN deduplication.

  ## Changes
  - `products` table
    - New column: `asin` (text, nullable) — stores the 10-character Amazon ASIN extracted from product_link URL
    - Unique index on `asin` (partial, WHERE asin IS NOT NULL) for fast dedup lookups
    - Backfill existing rows: extract ASIN from product_link using regex pattern `/dp/XXXXXXXXXX`

  ## Notes
  1. The unique partial index allows NULL values (products without ASINs) while preventing duplicate ASINs
  2. Backfill populates existing rows so dedup works immediately for the current product catalog
  3. All future products will have asin set at insert time by auto-analyze-product
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'asin'
  ) THEN
    ALTER TABLE products ADD COLUMN asin text;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS products_asin_unique
  ON products (asin)
  WHERE asin IS NOT NULL;

UPDATE products
SET asin = (regexp_match(product_link, '/dp/([A-Z0-9]{10})'))[1]
WHERE asin IS NULL
  AND product_link IS NOT NULL
  AND product_link ~ '/dp/[A-Z0-9]{10}';
