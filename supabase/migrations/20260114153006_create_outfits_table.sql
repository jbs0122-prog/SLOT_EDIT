/*
  # Create outfits table for storing fashion recommendations

  1. New Tables
    - `outfits`
      - `id` (text, primary key) - Unique identifier for each outfit
      - `occasion` (text) - Occasion/location (e.g., Office, Gym, City Walk)
      - `style` (text) - Style category (e.g., Minimal, Casual, Street)
      - `pick_rank` (integer) - Ranking order for recommendations
      - `image_url` (text) - Main outfit image URL
      - `image_url_flatlay` (text, nullable) - Flatlay style image URL
      - `image_url_on_model` (text, nullable) - On-model image URL
      - `insight_text` (text) - AI-generated styling insight
      - `top_name` (text) - Name of the top clothing item
      - `top_image` (text) - Image URL for the top item
      - `top_link` (text) - Shopping link for the top item
      - `bottom_name` (text) - Name of the bottom clothing item
      - `bottom_image` (text) - Image URL for the bottom item
      - `bottom_link` (text) - Shopping link for the bottom item
      - `shoes_name` (text) - Name of the shoes
      - `shoes_image` (text) - Image URL for the shoes
      - `shoes_link` (text) - Shopping link for the shoes
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Indexes
    - Index on `occasion` and `style` for fast filtering
    - Index on `pick_rank` for sorting recommendations

  3. Security
    - Enable RLS on `outfits` table
    - Allow anyone to read outfits (public data)
    - Only authenticated users can insert/update/delete (admin operations)

  4. Notes
    - Outfit recommendations are public and readable by all users
    - Admin operations require authentication
    - Column renamed from 'where' to 'occasion' to avoid SQL keyword conflict
*/

CREATE TABLE IF NOT EXISTS outfits (
  id text PRIMARY KEY,
  occasion text NOT NULL,
  style text NOT NULL,
  pick_rank integer DEFAULT 1,
  image_url text NOT NULL DEFAULT '',
  image_url_flatlay text,
  image_url_on_model text,
  insight_text text DEFAULT '',
  top_name text NOT NULL DEFAULT '',
  top_image text DEFAULT '',
  top_link text NOT NULL DEFAULT '',
  bottom_name text NOT NULL DEFAULT '',
  bottom_image text DEFAULT '',
  bottom_link text NOT NULL DEFAULT '',
  shoes_name text NOT NULL DEFAULT '',
  shoes_image text DEFAULT '',
  shoes_link text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_outfits_occasion_style ON outfits(occasion, style);
CREATE INDEX IF NOT EXISTS idx_outfits_pick_rank ON outfits(pick_rank);

-- Enable RLS
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read outfits
CREATE POLICY "Anyone can read outfits"
  ON outfits
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated users can insert outfits
CREATE POLICY "Authenticated users can insert outfits"
  ON outfits
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update outfits
CREATE POLICY "Authenticated users can update outfits"
  ON outfits
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only authenticated users can delete outfits
CREATE POLICY "Authenticated users can delete outfits"
  ON outfits
  FOR DELETE
  TO authenticated
  USING (true);