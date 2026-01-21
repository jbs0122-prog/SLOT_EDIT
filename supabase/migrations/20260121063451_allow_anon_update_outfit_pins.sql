/*
  # Allow anonymous users to update outfit pins
  
  1. Changes
    - Drop existing authenticated-only update policy
    - Create new update policy that allows both anon and authenticated users
    
  2. Security Note
    - This is for admin functionality
    - In production, you should add proper admin authentication
    - Or use service role key in a secure backend
*/

-- Drop existing restrictive update policy
DROP POLICY IF EXISTS "Authenticated users can update outfits" ON outfits;

-- Create new policy allowing anon users to update
CREATE POLICY "Allow outfit updates for pins"
  ON outfits
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
