/*
  # Add season column to outfits table

  ## Summary
  Adds a `season` column to the `outfits` table to store the outfit's primary season
  directly, rather than inferring it from linked product seasons.

  ## Changes
  - `outfits` table: new `season` text[] column (array of season strings)
    - Allowed values: 'spring', 'summer', 'fall', 'winter'
    - Defaults to empty array
    - Nullable (outfits without a season set are unfiltered)

  ## Notes
  - Existing outfits will have NULL/empty season until manually set by admin
  - Filtering in AdminProducts and AdminPins will use this column directly
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'season'
  ) THEN
    ALTER TABLE outfits ADD COLUMN season text[] DEFAULT '{}';
  END IF;
END $$;
