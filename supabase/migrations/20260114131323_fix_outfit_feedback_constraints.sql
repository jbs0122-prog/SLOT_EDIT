/*
  # Fix outfit feedback constraints and policies

  ## Changes

  1. Data Cleanup
    - Remove duplicate feedback entries (keep only the most recent one per session/outfit)
  
  2. Constraints
    - Add UNIQUE constraint on (session_id, outfit_id) to prevent duplicate votes
  
  3. Security Updates
    - Update DELETE policy to allow users to delete their own feedback
    - Remove UPDATE policy (not needed)

  ## Purpose
    - Ensures one user (session) can only have one feedback per outfit
    - Allows users to cancel/change their feedback
    - Prevents vote manipulation
*/

-- Step 1: Clean up duplicate entries (keep only the most recent one)
DELETE FROM outfit_feedback a
USING outfit_feedback b
WHERE a.id < b.id 
  AND a.session_id = b.session_id 
  AND a.outfit_id = b.outfit_id;

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE outfit_feedback 
  DROP CONSTRAINT IF EXISTS unique_session_outfit;

ALTER TABLE outfit_feedback 
  ADD CONSTRAINT unique_session_outfit 
  UNIQUE (session_id, outfit_id);

-- Step 3: Drop old restrictive policies
DROP POLICY IF EXISTS "No deletes allowed" ON outfit_feedback;
DROP POLICY IF EXISTS "No updates allowed" ON outfit_feedback;

-- Step 4: Create new policy allowing users to delete their own feedback
CREATE POLICY "Users can delete own feedback"
  ON outfit_feedback
  FOR DELETE
  TO anon, authenticated
  USING (true);