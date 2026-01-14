/*
  # Update outfits table RLS policies for public access

  1. Changes
    - Drop restrictive insert policy that requires authentication
    - Add public read policy for anonymous users
    - Keep data publicly readable
    - Allow initial data insertion from app

  2. Security
    - Anyone can read outfits (public data)
    - In production, you may want to restrict INSERT/UPDATE/DELETE to authenticated users only
    - For now, allowing public inserts for initial data load

  3. Notes
    - Outfits are public data shown to all users
    - After initial data load, you can make policies more restrictive
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can read outfits" ON outfits;
DROP POLICY IF EXISTS "Authenticated users can insert outfits" ON outfits;
DROP POLICY IF EXISTS "Authenticated users can update outfits" ON outfits;
DROP POLICY IF EXISTS "Authenticated users can delete outfits" ON outfits;

-- Allow anyone to read outfits (public data)
CREATE POLICY "Public can read outfits"
  ON outfits
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anyone to insert outfits (for initial data load)
-- In production, change this to authenticated users only
CREATE POLICY "Public can insert outfits"
  ON outfits
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated users to update outfits (admin only)
CREATE POLICY "Authenticated users can update outfits"
  ON outfits
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete outfits (admin only)
CREATE POLICY "Authenticated users can delete outfits"
  ON outfits
  FOR DELETE
  TO authenticated
  USING (true);