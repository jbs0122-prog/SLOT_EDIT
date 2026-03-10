/*
  # Add vibe_scores JSONB column to products table

  1. Modified Tables
    - `products`
      - `vibe_scores` (jsonb, nullable, default '{}')
        Stores per-vibe affinity scores computed during product analysis.
        Example: {"ELEVATED_COOL": 85, "ARTISTIC_MINIMAL": 42}
        Each value is 0-100 representing how strongly the product matches that vibe.

  2. Important Notes
    - This column enables vibe-specific product pool filtering in the auto-pipeline
    - Products with higher vibe_scores for a target vibe will be prioritized in outfit assembly
    - Existing products will have empty {} until re-analyzed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'vibe_scores'
  ) THEN
    ALTER TABLE products ADD COLUMN vibe_scores jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
