/*
  # Allow Anonymous Users to Delete Outfits and Outfit Items

  ## Overview
  Updates the outfits and outfit_items tables RLS policies to allow anonymous users to delete records.
  This is necessary for the admin panel to manage outfits without authentication.

  ## Changes
  1. Drop the existing DELETE policy for outfits that only allows authenticated users
  2. Create a new DELETE policy for outfits that allows both anonymous and authenticated users
  3. Drop the existing DELETE policy for outfit_items if it exists
  4. Create a new DELETE policy for outfit_items that allows both anonymous and authenticated users

  ## Security Considerations
  - This is acceptable for an admin panel that doesn't require authentication
  - Consider adding authentication in production environments
*/

-- Update outfits table DELETE policy
DROP POLICY IF EXISTS "Authenticated users can delete outfits" ON outfits;

CREATE POLICY "Anyone can delete outfits"
  ON outfits
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Update outfit_items table DELETE policy
DROP POLICY IF EXISTS "Authenticated users can delete outfit_items" ON outfit_items;

CREATE POLICY "Anyone can delete outfit_items"
  ON outfit_items
  FOR DELETE
  TO anon, authenticated
  USING (true);
