/*
  # Add batch_id column to products table

  ## Summary
  Adds a `batch_id` column to the products table to track which automated pipeline run
  a product was created from. This allows the auto-pipeline to:
  1. Isolate newly registered products for outfit generation
  2. Track pipeline runs for analytics and debugging
  3. Clean up failed pipeline runs if needed

  ## Changes
  - `products` table: adds `batch_id` (text, nullable) column with index
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE products ADD COLUMN batch_id text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_batch_id ON products(batch_id);
