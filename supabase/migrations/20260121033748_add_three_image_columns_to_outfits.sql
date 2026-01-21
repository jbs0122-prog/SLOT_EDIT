/*
  # Add three image columns to outfits table

  1. Changes
    - Remove existing `image_url` column from `outfits` table
    - Add `image_url_flatlay1` (text) for first flatlay image
    - Add `image_url_flatlay2` (text) for second flatlay image
    - Add `image_url_on_model` (text) for model shot image
  
  2. Notes
    - All three image columns are required (NOT NULL)
    - This migration will drop the old image_url column
*/

-- Remove old image_url column
ALTER TABLE outfits DROP COLUMN IF EXISTS image_url;

-- Add three new image columns
ALTER TABLE outfits ADD COLUMN IF NOT EXISTS image_url_flatlay1 text NOT NULL DEFAULT '';
ALTER TABLE outfits ADD COLUMN IF NOT EXISTS image_url_flatlay2 text NOT NULL DEFAULT '';
ALTER TABLE outfits ADD COLUMN IF NOT EXISTS image_url_on_model text NOT NULL DEFAULT '';