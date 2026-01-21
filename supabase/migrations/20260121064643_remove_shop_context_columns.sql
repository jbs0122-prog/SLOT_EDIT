/*
  # Remove SHOP THE CONTEXT columns from outfits table

  1. Changes
    - Drop item name, image, and link columns (outer, top, bottom, shoes, bag, accessory)
    - These columns are no longer needed as individual items now use pins for shopping
    - Pin columns (flatlay1_pins, flatlay2_pins, on_model_pins) are preserved

  2. Columns Removed
    - outer_name, outer_image, outer_link
    - top_name, top_image, top_link
    - bottom_name, bottom_image, bottom_link
    - shoes_name, shoes_image, shoes_link
    - bag_name, bag_image, bag_link
    - accessory_name, accessory_image, accessory_link

  3. Notes
    - Pin system handles all shopping links now
    - AI Insight section remains unchanged
    - This migration simplifies the data model
*/

-- Drop outer item columns
ALTER TABLE outfits DROP COLUMN IF EXISTS outer_name;
ALTER TABLE outfits DROP COLUMN IF EXISTS outer_image;
ALTER TABLE outfits DROP COLUMN IF EXISTS outer_link;

-- Drop top item columns
ALTER TABLE outfits DROP COLUMN IF EXISTS top_name;
ALTER TABLE outfits DROP COLUMN IF EXISTS top_image;
ALTER TABLE outfits DROP COLUMN IF EXISTS top_link;

-- Drop bottom item columns
ALTER TABLE outfits DROP COLUMN IF EXISTS bottom_name;
ALTER TABLE outfits DROP COLUMN IF EXISTS bottom_image;
ALTER TABLE outfits DROP COLUMN IF EXISTS bottom_link;

-- Drop shoes item columns
ALTER TABLE outfits DROP COLUMN IF EXISTS shoes_name;
ALTER TABLE outfits DROP COLUMN IF EXISTS shoes_image;
ALTER TABLE outfits DROP COLUMN IF EXISTS shoes_link;

-- Drop bag item columns
ALTER TABLE outfits DROP COLUMN IF EXISTS bag_name;
ALTER TABLE outfits DROP COLUMN IF EXISTS bag_image;
ALTER TABLE outfits DROP COLUMN IF EXISTS bag_link;

-- Drop accessory item columns
ALTER TABLE outfits DROP COLUMN IF EXISTS accessory_name;
ALTER TABLE outfits DROP COLUMN IF EXISTS accessory_image;
ALTER TABLE outfits DROP COLUMN IF EXISTS accessory_link;