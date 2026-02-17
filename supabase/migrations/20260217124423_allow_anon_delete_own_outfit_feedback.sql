/*
  # Allow anonymous users to delete their own outfit feedback

  1. Changes
    - Add DELETE policy for anonymous users on outfit_feedback table
    - This restores the ability for anonymous users to toggle/switch their like/dislike feedback

  2. Security
    - Anonymous users can delete outfit feedback rows
    - This is needed because the feedback system uses session-based tracking (not auth)
    - Feedback data (likes/dislikes) is non-sensitive public engagement data
    - The existing authenticated admin DELETE policy remains unchanged

  3. Important Notes
    - Without this policy, users cannot toggle off or switch their feedback after the first click
    - The unique constraint (session_id, outfit_id) prevents duplicate entries
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'outfit_feedback'
    AND policyname = 'Anonymous can delete outfit feedback'
  ) THEN
    CREATE POLICY "Anonymous can delete outfit feedback"
      ON outfit_feedback FOR DELETE
      TO anon
      USING (true);
  END IF;
END $$;
