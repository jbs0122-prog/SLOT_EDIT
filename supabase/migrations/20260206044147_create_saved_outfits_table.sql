/*
  # Create saved_outfits table

  1. New Tables
    - `saved_outfits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `outfit_id` (text, references outfits)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `saved_outfits` table
    - Users can only view their own saved outfits
    - Users can only insert their own saved outfits
    - Users can only delete their own saved outfits
*/

CREATE TABLE IF NOT EXISTS saved_outfits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_id text NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, outfit_id)
);

ALTER TABLE saved_outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved outfits"
  ON saved_outfits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save outfits"
  ON saved_outfits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave outfits"
  ON saved_outfits
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
