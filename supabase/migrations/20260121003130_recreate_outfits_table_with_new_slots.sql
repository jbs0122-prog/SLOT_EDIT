/*
  # Recreate outfits table with new slot structure

  This migration completely restructures the outfits table to support the new slot system.
  
  ## Changes
  
  1. Drop existing outfits table
    - Removes all existing data and structure
    
  2. Create new outfits table with updated columns
    - `id` (text, primary key) - Unique identifier
    - `gender` (text) - Gender category (MALE, FEMALE)
    - `body_type` (text) - Body type (SLIM, REGULAR, PLUS-SIZE)
    - `vibe` (text) - Style vibe (ELEVATED COOL, EFFORTLESS NATURAL, etc.)
    - `pick_rank` (integer) - Ranking order for recommendations
    - `image_url` (text) - Main outfit image URL
    - `image_url_flatlay` (text, nullable) - Flatlay style image URL
    - `image_url_on_model` (text, nullable) - On-model image URL
    - `insight_text` (text) - Styling insight
    - `top_name` (text) - Top clothing item name
    - `top_image` (text) - Top item image URL
    - `top_link` (text) - Top item shopping link
    - `bottom_name` (text) - Bottom clothing item name
    - `bottom_image` (text) - Bottom item image URL
    - `bottom_link` (text) - Bottom item shopping link
    - `shoes_name` (text) - Shoes name
    - `shoes_image` (text) - Shoes image URL
    - `shoes_link` (text) - Shoes shopping link
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp
    
  3. Indexes
    - Index on (gender, body_type, vibe) for fast filtering
    - Index on pick_rank for sorting
    
  4. Security
    - Enable RLS
    - Public read access for all users
    - Authenticated users can insert/update/delete (admin operations)
    
  ## Important Notes
  - This migration will DELETE all existing outfit data
  - The table structure is completely new to support gender, body type, and vibe selections
  - Old columns (occasion, style) are removed
*/

-- Drop existing outfits table and all related objects
DROP TABLE IF EXISTS outfits CASCADE;

-- Create new outfits table with updated structure
CREATE TABLE outfits (
  id text PRIMARY KEY,
  gender text NOT NULL,
  body_type text NOT NULL,
  vibe text NOT NULL,
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
CREATE INDEX idx_outfits_gender_body_vibe ON outfits(gender, body_type, vibe);
CREATE INDEX idx_outfits_pick_rank ON outfits(pick_rank);

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