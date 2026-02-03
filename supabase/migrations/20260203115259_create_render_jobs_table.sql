/*
  # Create render_jobs table - Queue for automated outfit rendering

  1. New Tables
    - `render_jobs`
      - `id` (uuid, primary key) - Unique job identifier
      - `outfit_id` (text, NOT NULL) - Foreign key to outfits table
      - `status` (text, NOT NULL) - Job status: pending, processing, completed, failed
      - `render_type` (text, NOT NULL) - Render type: flatlay, on_model
      - `result_image_url` (text) - URL of generated image (null until completed)
      - `error_message` (text) - Error details if job failed
      - `created_at` (timestamptz) - Job creation timestamp
      - `updated_at` (timestamptz) - Last status update timestamp

  2. Security
    - Enable RLS on `render_jobs` table
    - Add policy for public read access (all users can view job status)

  3. Foreign Keys
    - outfit_id references outfits(id) with CASCADE delete

  4. Indexes
    - Index on outfit_id for fast job lookups by outfit
    - Index on status for queue processing queries
    - Index on created_at for job ordering

  5. Notes
    - This table manages the automated rendering workflow
    - Status values: pending (queued), processing (in progress), completed (done), failed (error)
    - Render types: flatlay (flat lay composition), on_model (model wearing outfit)
    - Error messages stored for debugging failed jobs
    - outfit_id is text type to match existing outfits table
*/

CREATE TABLE IF NOT EXISTS render_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  render_type text NOT NULL,
  result_image_url text DEFAULT NULL,
  error_message text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_outfit FOREIGN KEY (outfit_id) REFERENCES outfits(id) ON DELETE CASCADE
);

ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view render jobs"
  ON render_jobs
  FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_render_jobs_outfit_id ON render_jobs(outfit_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_status ON render_jobs(status);
CREATE INDEX IF NOT EXISTS idx_render_jobs_created_at ON render_jobs(created_at DESC);
