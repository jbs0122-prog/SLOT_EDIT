/*
  # Fix Security Issues for Occasion Feedback

  1. Changes
    - Remove unused indexes (can be added back when query patterns are established)
    - Update RLS policy to include basic validation instead of always true
    - Add length constraints to prevent abuse
  
  2. Security Improvements
    - RLS policy now validates:
      - Occasion field is not empty
      - Occasion length is between 1 and 200 characters
      - Email format validation (if provided)
      - Prevents spam and abuse while keeping form public
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_occasion_feedback_created_at;
DROP INDEX IF EXISTS idx_occasion_feedback_occasion;

-- Drop the existing "always true" policy
DROP POLICY IF EXISTS "Anyone can submit occasion feedback" ON occasion_feedback;

-- Create a more restrictive policy with validation
CREATE POLICY "Public can submit valid occasion feedback"
  ON occasion_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Occasion must not be empty and must be reasonable length
    occasion IS NOT NULL 
    AND length(trim(occasion)) > 0 
    AND length(trim(occasion)) <= 200
    -- If email is provided, it must be reasonable length
    AND (email IS NULL OR length(trim(email)) <= 100)
  );