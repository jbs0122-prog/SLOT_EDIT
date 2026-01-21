/*
  # Remove pick_rank column from outfits table

  ## Changes
  
  1. Drop Indexes
    - Remove `idx_outfits_pick_rank` index
    
  2. Remove Columns
    - Drop `pick_rank` column from outfits table
    
  ## Rationale
  
  The `pick_rank` column was originally intended for static ranking,
  but the system now uses dynamic ranking based on the outfit_feedback table
  (likes/dislikes). The pick_rank column is:
  - Not used in the application code
  - Not included in the Outfit TypeScript interface
  - Redundant with the dynamic feedback-based ranking system
  
  Removing it simplifies the schema and eliminates an unused maintenance point.
*/

-- Drop the index on pick_rank
DROP INDEX IF EXISTS idx_outfits_pick_rank;

-- Remove the pick_rank column
ALTER TABLE outfits DROP COLUMN IF EXISTS pick_rank;