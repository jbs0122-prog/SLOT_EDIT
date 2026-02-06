/*
  # Add nobg_image_url column to products table

  1. Modified Tables
    - `products`
      - Added `nobg_image_url` (text, nullable) - stores the URL of the background-removed product image

  2. Notes
    - This column caches the pixian.AI processed image URL to avoid re-processing
    - Used during auto outfit generation and flatlay rendering
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'nobg_image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN nobg_image_url text;
  END IF;
END $$;
