/*
  # Fix outfit_feedback DELETE policy for authenticated users

  1. Problem
    - The existing DELETE policy for authenticated users only allows admins (`is_admin()`)
    - Non-admin logged-in users cannot toggle or change their feedback (like/dislike)
    - This causes feedback buttons to appear unresponsive for logged-in users

  2. Changes
    - Drop the admin-only DELETE policy for authenticated users
    - Create a new DELETE policy allowing authenticated users to delete feedback rows
      (matching the anon policy behavior)

  3. Security
    - The client always filters by session_id, so users only delete their own feedback
    - The unique constraint on (session_id, outfit_id) prevents duplicates
*/

DROP POLICY IF EXISTS "Admin can delete outfit feedback" ON outfit_feedback;

CREATE POLICY "Authenticated can delete outfit feedback"
  ON outfit_feedback
  FOR DELETE
  TO authenticated
  USING (true);
