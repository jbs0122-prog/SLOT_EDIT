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
    - Add policy allowing anyone to insert valid feedback
    - Add policy allowing only authenticated users to read all feedback (admin access)

  3. Notes
    - Public can submit feedback with validation
    - Admin access required to view feedback
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

-- Allow anyone to submit valid feedback
CREATE POLICY "Public can submit valid occasion feedback"
  ON occasion_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    occasion IS NOT NULL 
    AND length(trim(occasion)) > 0 
    AND length(trim(occasion)) <= 200
    AND (email IS NULL OR length(trim(email)) <= 100)
  );

-- Only authenticated users can view all feedback
CREATE POLICY "Authenticated users can view all feedback"
  ON occasion_feedback
  FOR SELECT
  TO authenticated
  USING (true);