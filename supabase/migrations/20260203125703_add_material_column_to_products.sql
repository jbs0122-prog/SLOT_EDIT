/*
  # Add material column to products table

  1. Changes
    - Add `material` column to `products` table (text type, nullable)
    - This field will store the material/fabric information for products (e.g., cotton, wool, leather)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'material'
  ) THEN
    ALTER TABLE products ADD COLUMN material text;
  END IF;
END $$;