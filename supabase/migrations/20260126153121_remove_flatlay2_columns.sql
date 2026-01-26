/*
  # Remove flatlay2 columns from outfits table

  1. Changes
    - Drop `image_url_flatlay2` column from `outfits` table
    - Drop `flatlay2_pins` column from `outfits` table
  
  2. Notes
    - These columns are no longer needed as we'll only use one flatlay image
    - Using IF EXISTS to prevent errors if columns don't exist
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'image_url_flatlay2'
  ) THEN
    ALTER TABLE outfits DROP COLUMN image_url_flatlay2;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'flatlay2_pins'
  ) THEN
    ALTER TABLE outfits DROP COLUMN flatlay2_pins;
  END IF;
END $$;