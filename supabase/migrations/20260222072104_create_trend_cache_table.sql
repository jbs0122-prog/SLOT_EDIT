/*
  # Create trend_cache table

  1. New Tables
    - `trend_cache`
      - `season` (text, primary key) - Season identifier (spring, summer, fall, winter, all)
      - `trend_data` (text) - Cached trend summary from AI
      - `updated_at` (timestamptz) - Last update timestamp for cache invalidation

  2. Security
    - Enable RLS on `trend_cache` table
    - Add policy for service role to manage data
    - Add policy for authenticated users to read data

  3. Important Notes
    - This table caches AI-generated trend data to minimize API calls
    - Cache is invalidated after 24 hours
    - Only the service role can write to this table (via edge functions)
*/

CREATE TABLE IF NOT EXISTS trend_cache (
  season text PRIMARY KEY,
  trend_data text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trend_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage trend cache"
  ON trend_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read trend cache"
  ON trend_cache
  FOR SELECT
  TO authenticated
  USING (true);
