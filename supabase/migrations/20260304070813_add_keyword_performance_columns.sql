/*
  # Add accepted_count and total_count to keyword_performance

  ## Changes
  - Adds `accepted_count` (integer, default 0): number of times this keyword led to an accepted outfit
  - Adds `total_count` (integer, default 0): total times this keyword appeared in any pipeline run
  - These columns close the feedback loop for Issue 1: keyword learning

  ## Notes
  - Uses IF NOT EXISTS pattern to be safe on re-run
  - Existing rows get default values (0, 0)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'keyword_performance' AND column_name = 'accepted_count'
  ) THEN
    ALTER TABLE keyword_performance ADD COLUMN accepted_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'keyword_performance' AND column_name = 'total_count'
  ) THEN
    ALTER TABLE keyword_performance ADD COLUMN total_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;
