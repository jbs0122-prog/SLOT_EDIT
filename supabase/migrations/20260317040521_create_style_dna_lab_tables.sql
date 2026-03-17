/*
  # Create Style DNA Lab Tables

  This migration creates the core tables for the Style DNA Lab feature,
  which provides a 432-case matrix (Gender x Body Type x Vibe x Look x Season)
  for reference outfit curation and learning.

  1. New Tables
    - `style_dna_cells`
      - `id` (uuid, primary key) - Unique identifier
      - `gender` (text) - MALE or FEMALE
      - `body_type` (text) - slim, regular, or plus-size
      - `vibe` (text) - One of 6 vibe types
      - `look_key` (text) - A, B, or C
      - `season` (text) - spring, summer, fall, or winter
      - `status` (text) - empty, in_progress, or ready
      - `reference_count` (int) - Number of uploaded references
      - `style_brief` (text) - Style direction summary
      - `learned_palette` (jsonb) - Learned color palette from references
      - `learned_materials` (jsonb) - Learned material preferences
      - `learned_silhouettes` (jsonb) - Learned silhouette patterns
      - `priority` (int) - Work priority
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `style_dna_references`
      - `id` (uuid, primary key)
      - `cell_id` (uuid, FK -> style_dna_cells.id)
      - `image_url` (text) - Reference image URL
      - `source` (text) - upload, pinterest, url
      - `notes` (text) - Admin notes
      - `ai_analysis` (jsonb) - Gemini analysis results
      - `extracted_items` (jsonb) - Extracted item list from image
      - `sort_order` (int) - Sort order within cell
      - `created_at` (timestamptz)

    - `style_dna_learned_rules`
      - `id` (uuid, primary key)
      - `cell_id` (uuid, FK -> style_dna_cells.id)
      - `rule_type` (text) - color_palette, material_combo, silhouette, formality, proportion, keyword
      - `rule_data` (jsonb) - Learned rule data
      - `confidence` (float) - Confidence score 0-1
      - `source_reference_ids` (uuid[]) - Which references contributed
      - `created_at` (timestamptz)

  2. Modified Tables
    - `outfits` - Added `look_key` column (text, nullable)

  3. Security
    - Enable RLS on all new tables
    - Authenticated admin users can read/write
    - Anon users can read cells and references (for frontend display)

  4. Indexes
    - Composite unique index on style_dna_cells (gender, body_type, vibe, look_key, season)
    - Index on style_dna_references (cell_id)
    - Index on style_dna_learned_rules (cell_id)
*/

-- style_dna_cells: 432 combination matrix
CREATE TABLE IF NOT EXISTS style_dna_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gender text NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
  body_type text NOT NULL CHECK (body_type IN ('slim', 'regular', 'plus-size')),
  vibe text NOT NULL CHECK (vibe IN ('ELEVATED_COOL', 'EFFORTLESS_NATURAL', 'ARTISTIC_MINIMAL', 'RETRO_LUXE', 'SPORT_MODERN', 'CREATIVE_LAYERED')),
  look_key text NOT NULL CHECK (look_key IN ('A', 'B', 'C')),
  season text NOT NULL CHECK (season IN ('spring', 'summer', 'fall', 'winter')),
  status text NOT NULL DEFAULT 'empty' CHECK (status IN ('empty', 'in_progress', 'ready')),
  reference_count int NOT NULL DEFAULT 0,
  style_brief text DEFAULT '',
  learned_palette jsonb DEFAULT '{}',
  learned_materials jsonb DEFAULT '[]',
  learned_silhouettes jsonb DEFAULT '[]',
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gender, body_type, vibe, look_key, season)
);

ALTER TABLE style_dna_cells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read style_dna_cells"
  ON style_dna_cells FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert style_dna_cells"
  ON style_dna_cells FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update style_dna_cells"
  ON style_dna_cells FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete style_dna_cells"
  ON style_dna_cells FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can read style_dna_cells"
  ON style_dna_cells FOR SELECT
  TO anon
  USING (status = 'ready');

-- style_dna_references: reference images per cell
CREATE TABLE IF NOT EXISTS style_dna_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_id uuid NOT NULL REFERENCES style_dna_cells(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  source text NOT NULL DEFAULT 'url' CHECK (source IN ('upload', 'pinterest', 'url')),
  notes text DEFAULT '',
  ai_analysis jsonb DEFAULT NULL,
  extracted_items jsonb DEFAULT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_style_dna_references_cell_id ON style_dna_references(cell_id);

ALTER TABLE style_dna_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read style_dna_references"
  ON style_dna_references FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert style_dna_references"
  ON style_dna_references FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update style_dna_references"
  ON style_dna_references FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete style_dna_references"
  ON style_dna_references FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can read style_dna_references"
  ON style_dna_references FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM style_dna_cells
      WHERE style_dna_cells.id = style_dna_references.cell_id
      AND style_dna_cells.status = 'ready'
    )
  );

-- style_dna_learned_rules: extracted patterns from references
CREATE TABLE IF NOT EXISTS style_dna_learned_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_id uuid NOT NULL REFERENCES style_dna_cells(id) ON DELETE CASCADE,
  rule_type text NOT NULL CHECK (rule_type IN ('color_palette', 'material_combo', 'silhouette', 'formality', 'proportion', 'keyword')),
  rule_data jsonb NOT NULL DEFAULT '{}',
  confidence float NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  source_reference_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_style_dna_learned_rules_cell_id ON style_dna_learned_rules(cell_id);

ALTER TABLE style_dna_learned_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read style_dna_learned_rules"
  ON style_dna_learned_rules FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert style_dna_learned_rules"
  ON style_dna_learned_rules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update style_dna_learned_rules"
  ON style_dna_learned_rules FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete style_dna_learned_rules"
  ON style_dna_learned_rules FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can read style_dna_learned_rules"
  ON style_dna_learned_rules FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM style_dna_cells
      WHERE style_dna_cells.id = style_dna_learned_rules.cell_id
      AND style_dna_cells.status = 'ready'
    )
  );

-- Add look_key column to outfits table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'look_key'
  ) THEN
    ALTER TABLE outfits ADD COLUMN look_key text CHECK (look_key IS NULL OR look_key IN ('A', 'B', 'C'));
  END IF;
END $$;

-- Seed all 432 cells (2 genders x 3 body_types x 6 vibes x 3 looks x 4 seasons)
INSERT INTO style_dna_cells (gender, body_type, vibe, look_key, season)
SELECT g.gender, b.body_type, v.vibe, l.look_key, s.season
FROM
  (VALUES ('MALE'), ('FEMALE')) AS g(gender),
  (VALUES ('slim'), ('regular'), ('plus-size')) AS b(body_type),
  (VALUES ('ELEVATED_COOL'), ('EFFORTLESS_NATURAL'), ('ARTISTIC_MINIMAL'), ('RETRO_LUXE'), ('SPORT_MODERN'), ('CREATIVE_LAYERED')) AS v(vibe),
  (VALUES ('A'), ('B'), ('C')) AS l(look_key),
  (VALUES ('spring'), ('summer'), ('fall'), ('winter')) AS s(season)
ON CONFLICT (gender, body_type, vibe, look_key, season) DO NOTHING;