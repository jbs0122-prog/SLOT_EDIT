/*
  # Allow Anonymous Users to Insert Outfits

  ## Overview
  Updates the outfits table RLS policies to allow anonymous users to create new outfits.
  This is necessary for the admin panel to generate outfits automatically without authentication.

  ## Changes
  1. Drop the existing INSERT policy that only allows authenticated users
  2. Create a new INSERT policy that allows both anonymous and authenticated users

  ## Security Considerations
  - This is acceptable for an admin panel that doesn't require authentication
  - Consider adding authentication in production environments
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can insert outfits" ON outfits;

-- Create new policy that allows both anon and authenticated users
CREATE POLICY "Anyone can insert outfits"
  ON outfits
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
