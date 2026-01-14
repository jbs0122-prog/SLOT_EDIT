/*
  # Add pick_rank column to outfits table

  1. Changes
    - Add `pick_rank` column (integer) with default value of 1
    - Add index on `pick_rank` for sorting

  2. Notes
    - This column is used for ranking outfit recommendations
    - Default value ensures all existing rows have a valid rank
*/

-- Add pick_rank column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'pick_rank'
  ) THEN
    ALTER TABLE outfits ADD COLUMN pick_rank integer DEFAULT 1;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_outfits_pick_rank ON outfits(pick_rank);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';