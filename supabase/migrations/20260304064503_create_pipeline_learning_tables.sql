/*
  # Create Pipeline Learning System Tables

  1. New Tables
    - `pipeline_feedback`
      - `id` (uuid, primary key)
      - `batch_id` (text) - links to auto-pipeline batch
      - `outfit_id` (uuid, references outfits) - which outfit was evaluated
      - `action` (text) - 'accepted' | 'rejected' | 'edited'
      - `vibe` (text) - vibe context
      - `look` (text, nullable) - look variant if applicable
      - `season` (text, nullable) - season context
      - `gender` (text, nullable) - gender context
      - `items` (jsonb) - array of item metadata from the outfit
      - `rule_scores` (jsonb, nullable) - matching rule breakdown scores
      - `ai_score` (float, nullable) - AI match assist score
      - `admin_note` (text, nullable) - optional admin annotation
      - `created_at` (timestamptz)

    - `keyword_performance`
      - `id` (uuid, primary key)
      - `keyword` (text) - the search keyword used
      - `vibe` (text) - vibe context
      - `slot` (text) - target slot category
      - `search_count` (int) - how many times this keyword was searched
      - `result_count` (int) - total results returned
      - `registered_count` (int) - products successfully registered
      - `accepted_count` (int) - products included in accepted outfits
      - `avg_rating` (float) - average product rating from results
      - `last_used_at` (timestamptz)
      - `created_at` (timestamptz)

    - `vibe_item_expansions`
      - `id` (uuid, primary key)
      - `vibe` (text) - vibe key
      - `look` (text) - look variant A/B/C
      - `slot` (text) - slot category
      - `item_name` (text) - expanded item type name
      - `source` (text) - 'feedback' | 'trending' | 'admin'
      - `success_count` (int) - times item appeared in accepted outfits
      - `fail_count` (int) - times item appeared in rejected outfits
      - `score` (float) - success ratio (0-1)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all three tables
    - Only authenticated admin users can read/write
*/

CREATE TABLE IF NOT EXISTS pipeline_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id text NOT NULL,
  outfit_id uuid,
  action text NOT NULL CHECK (action IN ('accepted', 'rejected', 'edited')),
  vibe text NOT NULL,
  look text,
  season text,
  gender text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  rule_scores jsonb,
  ai_score float,
  admin_note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pipeline_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read pipeline feedback"
  ON pipeline_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert pipeline feedback"
  ON pipeline_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update pipeline feedback"
  ON pipeline_feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete pipeline feedback"
  ON pipeline_feedback FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS keyword_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  vibe text NOT NULL,
  slot text NOT NULL,
  search_count int NOT NULL DEFAULT 0,
  result_count int NOT NULL DEFAULT 0,
  registered_count int NOT NULL DEFAULT 0,
  accepted_count int NOT NULL DEFAULT 0,
  avg_rating float NOT NULL DEFAULT 0,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(keyword, vibe, slot)
);

ALTER TABLE keyword_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read keyword performance"
  ON keyword_performance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert keyword performance"
  ON keyword_performance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update keyword performance"
  ON keyword_performance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete keyword performance"
  ON keyword_performance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS vibe_item_expansions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vibe text NOT NULL,
  look text NOT NULL,
  slot text NOT NULL,
  item_name text NOT NULL,
  source text NOT NULL DEFAULT 'feedback' CHECK (source IN ('feedback', 'trending', 'admin')),
  success_count int NOT NULL DEFAULT 0,
  fail_count int NOT NULL DEFAULT 0,
  score float NOT NULL DEFAULT 0.5,
  created_at timestamptz DEFAULT now(),
  UNIQUE(vibe, look, slot, item_name)
);

ALTER TABLE vibe_item_expansions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read vibe item expansions"
  ON vibe_item_expansions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert vibe item expansions"
  ON vibe_item_expansions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update vibe item expansions"
  ON vibe_item_expansions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete vibe item expansions"
  ON vibe_item_expansions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_pipeline_feedback_batch ON pipeline_feedback(batch_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_feedback_vibe ON pipeline_feedback(vibe);
CREATE INDEX IF NOT EXISTS idx_keyword_performance_vibe_slot ON keyword_performance(vibe, slot);
CREATE INDEX IF NOT EXISTS idx_vibe_item_expansions_lookup ON vibe_item_expansions(vibe, look, slot);
CREATE INDEX IF NOT EXISTS idx_vibe_item_expansions_score ON vibe_item_expansions(score);
