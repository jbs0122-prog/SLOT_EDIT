/*
  # Add Image Pins to Outfits Table

  1. Changes
    - Add `flatlay1_pins` column to store pin positions for first flatlay image
    - Add `flatlay2_pins` column to store pin positions for second flatlay image
    - Add `on_model_pins` column to store pin positions for on-model image
    
  2. Column Details
    - Each column is JSONB type storing an array of pin objects
    - Pin object structure: { x: number, y: number, item: string }
    - x, y are percentages (0-100) representing position on image
    - item is one of: 'outer', 'top', 'bottom', 'shoes', 'bag', 'accessory'
    
  3. Security
    - No RLS changes needed as these columns inherit existing table policies
*/

-- Add pin columns to outfits table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'flatlay1_pins'
  ) THEN
    ALTER TABLE outfits ADD COLUMN flatlay1_pins jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'flatlay2_pins'
  ) THEN
    ALTER TABLE outfits ADD COLUMN flatlay2_pins jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'on_model_pins'
  ) THEN
    ALTER TABLE outfits ADD COLUMN on_model_pins jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;