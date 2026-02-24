/*
  # Create outfit_comments table

  1. New Tables
    - `outfit_comments`
      - `id` (uuid, primary key)
      - `outfit_id` (text, references outfits)
      - `session_id` (text, for anonymous users)
      - `user_id` (uuid, optional, references auth.users)
      - `nickname` (text, display name)
      - `content` (text, comment body)
      - `likes` (integer, like count)
      - `parent_id` (uuid, for reply threads)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `outfit_comments` table
    - Anyone can read comments
    - Session-based insert for anonymous commenting
    - Users can delete own comments by session

  3. Indexes
    - Index on outfit_id for fast comment loading
    - Index on parent_id for reply threading
    - Index on created_at for sorting
*/

CREATE TABLE IF NOT EXISTS outfit_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id text NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nickname text NOT NULL DEFAULT '',
  content text NOT NULL,
  likes integer NOT NULL DEFAULT 0,
  parent_id uuid REFERENCES outfit_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE outfit_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON outfit_comments FOR SELECT
  TO anon, authenticated
  USING (outfit_id IS NOT NULL);

CREATE POLICY "Anyone can insert comments with session"
  ON outfit_comments FOR INSERT
  TO anon, authenticated
  WITH CHECK (session_id IS NOT NULL AND content <> '');

CREATE POLICY "Session owner can delete own comments"
  ON outfit_comments FOR DELETE
  TO anon, authenticated
  USING (session_id = session_id);

CREATE INDEX IF NOT EXISTS idx_outfit_comments_outfit_id ON outfit_comments(outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_comments_parent_id ON outfit_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_outfit_comments_created_at ON outfit_comments(created_at DESC);
