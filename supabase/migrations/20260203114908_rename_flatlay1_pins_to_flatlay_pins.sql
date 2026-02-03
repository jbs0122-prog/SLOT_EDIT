/*
  # Rename flatlay1_pins to flatlay_pins

  1. Changes
    - Rename `flatlay1_pins` column to `flatlay_pins` in `outfits` table
    - This unifies the column name with frontend code for consistency
    - All existing data is preserved

  2. Notes
    - This is a simple column rename operation
    - No data migration needed
    - Frontend already uses `flatlay_pins` in types and UI
*/

-- Rename the column to match frontend naming convention
ALTER TABLE outfits 
RENAME COLUMN flatlay1_pins TO flatlay_pins;
