/*
  # Create Occasion Feedback Table

  1. New Tables
    - `occasion_feedback`
      - `id` (uuid, primary key) - Unique identifier for each feedback entry
      - `occasion` (text) - The occasion suggested by the user
      - `email` (text, nullable) - Optional email address for follow-up
      - `created_at` (timestamptz) - Timestamp when feedback was submitted
      - `ip_address` (text, nullable) - IP address for spam prevention
      - `user_agent` (text, nullable) - Browser user agent for analytics
  
  2. Security
    - Enable RLS on `occasion_feedback` table
    - Add policy allowing anyone to insert feedback (public submission)
    - Add policy allowing only authenticated users to read all feedback (admin access)

  3. Indexes
    - Add index on `created_at` for efficient date-based queries
    - Add index on `occasion` for searching specific occasions
*/

-- Create the occasion_feedback table
CREATE TABLE IF NOT EXISTS occasion_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occasion text NOT NULL,
  email text,
  created_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Enable Row Level Security
ALTER TABLE occasion_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit feedback (public form)
CREATE POLICY "Anyone can submit occasion feedback"
  ON occasion_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users can view all feedback (for admin dashboard)
CREATE POLICY "Authenticated users can view all feedback"
  ON occasion_feedback
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_occasion_feedback_created_at 
  ON occasion_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_occasion_feedback_occasion 
  ON occasion_feedback(occasion);