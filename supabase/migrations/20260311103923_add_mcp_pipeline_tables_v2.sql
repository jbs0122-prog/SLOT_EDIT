/*
  # MCP Pipeline Orchestration Tables

  1. New Tables
    - `mcp_pipeline_runs` - Tracks server-side pipeline runs with state persistence for resume
    - `mcp_pipeline_logs` - Append-only event log per run for real-time polling

  2. Security
    - RLS enabled, authenticated users can read/write their own runs
*/

CREATE TABLE IF NOT EXISTS mcp_pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  gender text NOT NULL DEFAULT 'FEMALE',
  body_type text NOT NULL DEFAULT 'regular',
  vibe text NOT NULL DEFAULT 'ELEVATED_COOL',
  season text NOT NULL DEFAULT 'fall',
  products_per_slot integer NOT NULL DEFAULT 3,
  phase text NOT NULL DEFAULT 'keywords',
  phase_data jsonb NOT NULL DEFAULT '{}',
  registered_count integer NOT NULL DEFAULT 0,
  outfit_ids jsonb NOT NULL DEFAULT '[]',
  outfit_candidates jsonb NOT NULL DEFAULT '[]',
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE mcp_pipeline_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mcp_pipeline_runs' AND policyname = 'Authenticated users can read pipeline runs'
  ) THEN
    CREATE POLICY "Authenticated users can read pipeline runs"
      ON mcp_pipeline_runs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mcp_pipeline_runs' AND policyname = 'Authenticated users can insert pipeline runs'
  ) THEN
    CREATE POLICY "Authenticated users can insert pipeline runs"
      ON mcp_pipeline_runs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mcp_pipeline_runs' AND policyname = 'Authenticated users can update pipeline runs'
  ) THEN
    CREATE POLICY "Authenticated users can update pipeline runs"
      ON mcp_pipeline_runs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS mcp_pipeline_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id text NOT NULL,
  step text NOT NULL DEFAULT 'system',
  status text NOT NULL DEFAULT 'progress',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mcp_pipeline_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mcp_pipeline_logs' AND policyname = 'Authenticated users can read pipeline logs'
  ) THEN
    CREATE POLICY "Authenticated users can read pipeline logs"
      ON mcp_pipeline_logs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mcp_pipeline_logs' AND policyname = 'Service role can insert pipeline logs'
  ) THEN
    CREATE POLICY "Service role can insert pipeline logs"
      ON mcp_pipeline_logs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mcp_pipeline_logs_batch_id ON mcp_pipeline_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_mcp_pipeline_logs_created_at ON mcp_pipeline_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_mcp_pipeline_runs_batch_id ON mcp_pipeline_runs(batch_id);
CREATE INDEX IF NOT EXISTS idx_mcp_pipeline_runs_status ON mcp_pipeline_runs(status);
