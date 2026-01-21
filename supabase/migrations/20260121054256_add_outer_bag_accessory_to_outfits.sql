/*
  # Add outer, bag, and accessory fields to outfits table

  1. Changes
    - Add `outer_name` (text) - Name of the outer layer item
    - Add `outer_image` (text) - Image URL for the outer layer item
    - Add `outer_link` (text) - Shopping link for the outer layer item
    - Add `bag_name` (text) - Name of the bag item
    - Add `bag_image` (text) - Image URL for the bag item
    - Add `bag_link` (text) - Shopping link for the bag item
    - Add `accessory_name` (text) - Name of the accessory item
    - Add `accessory_image` (text) - Image URL for the accessory item
    - Add `accessory_link` (text) - Shopping link for the accessory item

  2. Notes
    - All new columns have default empty strings for consistency with existing item columns
    - These additions expand the outfit items from 3 (top, bottom, shoes) to 6 (outer, top, bottom, shoes, bag, accessory)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'outer_name'
  ) THEN
    ALTER TABLE outfits ADD COLUMN outer_name text DEFAULT ''::text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'outer_image'
  ) THEN
    ALTER TABLE outfits ADD COLUMN outer_image text DEFAULT ''::text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'outer_link'
  ) THEN
    ALTER TABLE outfits ADD COLUMN outer_link text DEFAULT ''::text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'bag_name'
  ) THEN
    ALTER TABLE outfits ADD COLUMN bag_name text DEFAULT ''::text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'bag_image'
  ) THEN
    ALTER TABLE outfits ADD COLUMN bag_image text DEFAULT ''::text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'bag_link'
  ) THEN
    ALTER TABLE outfits ADD COLUMN bag_link text DEFAULT ''::text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'accessory_name'
  ) THEN
    ALTER TABLE outfits ADD COLUMN accessory_name text DEFAULT ''::text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'accessory_image'
  ) THEN
    ALTER TABLE outfits ADD COLUMN accessory_image text DEFAULT ''::text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'accessory_link'
  ) THEN
    ALTER TABLE outfits ADD COLUMN accessory_link text DEFAULT ''::text;
  END IF;
END $$;