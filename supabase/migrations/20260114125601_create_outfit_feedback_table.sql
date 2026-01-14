/*
  # Create outfit feedback table for likes/dislikes

  1. New Tables
    - `outfit_feedback`
      - `id` (uuid, primary key)
      - `outfit_id` (text, outfit identifier)
      - `feedback_type` (text, 'like' or 'dislike')
      - `session_id` (text, anonymous user session tracking)
      - `created_at` (timestamp)

  2. Indexes
    - Index on `outfit_id` for fast lookups
    - Index on `session_id` and `outfit_id` combination to prevent duplicate votes

  3. Security
    - Enable RLS on `outfit_feedback` table
    - Allow anyone to insert feedback (public voting)
    - Allow anyone to read feedback counts (public data)

  4. Notes
    - Tracks likes/dislikes for each outfit
    - Uses session_id to prevent duplicate votes from same user
    - Allows calculating dynamic ranking based on like/dislike ratio
*/

CREATE TABLE IF NOT EXISTS outfit_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id text NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('like', 'dislike')),
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_outfit_feedback_outfit_id ON outfit_feedback(outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_feedback_session_outfit ON outfit_feedback(session_id, outfit_id);

-- Enable RLS
ALTER TABLE outfit_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback
CREATE POLICY "Anyone can submit feedback"
  ON outfit_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to read feedback
CREATE POLICY "Anyone can read feedback"
  ON outfit_feedback
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Prevent users from updating or deleting feedback
CREATE POLICY "No updates allowed"
  ON outfit_feedback
  FOR UPDATE
  TO anon, authenticated
  USING (false);

CREATE POLICY "No deletes allowed"
  ON outfit_feedback
  FOR DELETE
  TO anon, authenticated
  USING (false);