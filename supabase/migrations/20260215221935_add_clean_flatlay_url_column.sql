/*
  # Add clean flatlay image URL column

  1. Modified Tables
    - `outfits`
      - `image_url_flatlay_clean` (text) - Stores the flatlay image URL without price labels, needed for AI model photo generation and revision

  2. Notes
    - This clean version (no price overlays) is used by the model photo generator
    - Enables model photo revision from the outfit product linker screen
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'image_url_flatlay_clean'
  ) THEN
    ALTER TABLE outfits ADD COLUMN image_url_flatlay_clean text;
  END IF;
END $$;