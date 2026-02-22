/*
  # Add image_features column to products

  1. Modified Tables
    - `products`
      - `image_features` (jsonb, nullable) - Stores AI-extracted visual features from product images
        including dominant colors, texture, pattern details, and style attributes

  2. Important Notes
    - This column stores pre-computed image analysis results to avoid repeated API calls
    - Features are extracted once during product registration/update
    - Structure: { dominantColors: string[], texture: string, visualWeight: string, styleAttributes: string[] }
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'image_features'
  ) THEN
    ALTER TABLE products ADD COLUMN image_features jsonb;
  END IF;
END $$;
