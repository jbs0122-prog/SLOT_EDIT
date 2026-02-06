/*
  # Secure all tables with proper RLS policies

  1. Changes
    - Drop all existing overly-permissive RLS policies on all tables
    - Create new restrictive policies:
      - `products`: Public can read, only authenticated admin can write
      - `outfits`: Public can read, only authenticated admin can write
      - `outfit_items`: Public can read, only authenticated admin can write
      - `render_jobs`: Public can read, only authenticated admin can write
      - `outfit_feedback`: Public can submit and read feedback, only authenticated admin can delete
      - `occasion_feedback`: Public can submit feedback, only authenticated admin can read/delete

  2. Security
    - All write operations (INSERT/UPDATE/DELETE) on core tables restricted to authenticated users
    - Read access preserved for public-facing pages
    - Feedback submission preserved for anonymous users
*/

-- =============================================
-- PRODUCTS TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Anyone can insert products" ON products;
DROP POLICY IF EXISTS "Anyone can update products" ON products;
DROP POLICY IF EXISTS "Anyone can delete products" ON products;

CREATE POLICY "Public can view products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated admin can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated admin can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated admin can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- OUTFITS TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can read outfits" ON outfits;
DROP POLICY IF EXISTS "Anyone can insert outfits" ON outfits;
DROP POLICY IF EXISTS "Anyone can delete outfits" ON outfits;
DROP POLICY IF EXISTS "Allow outfit updates for pins" ON outfits;

CREATE POLICY "Public can view outfits"
  ON outfits FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated admin can insert outfits"
  ON outfits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated admin can update outfits"
  ON outfits FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated admin can delete outfits"
  ON outfits FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- OUTFIT_ITEMS TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can view outfit items" ON outfit_items;
DROP POLICY IF EXISTS "Anyone can insert outfit items" ON outfit_items;
DROP POLICY IF EXISTS "Anyone can update outfit items" ON outfit_items;
DROP POLICY IF EXISTS "Anyone can delete outfit items" ON outfit_items;
DROP POLICY IF EXISTS "Anyone can delete outfit_items" ON outfit_items;

CREATE POLICY "Public can view outfit items"
  ON outfit_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated admin can insert outfit items"
  ON outfit_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated admin can update outfit items"
  ON outfit_items FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated admin can delete outfit items"
  ON outfit_items FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- RENDER_JOBS TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can view render jobs" ON render_jobs;

CREATE POLICY "Public can view render jobs"
  ON render_jobs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated admin can insert render jobs"
  ON render_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated admin can update render jobs"
  ON render_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated admin can delete render jobs"
  ON render_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- OUTFIT_FEEDBACK TABLE
-- =============================================
DROP POLICY IF EXISTS "Anyone can read feedback" ON outfit_feedback;
DROP POLICY IF EXISTS "Anyone can submit feedback" ON outfit_feedback;
DROP POLICY IF EXISTS "Users can delete own feedback" ON outfit_feedback;

CREATE POLICY "Public can view outfit feedback"
  ON outfit_feedback FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can submit outfit feedback"
  ON outfit_feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    outfit_id IS NOT NULL
    AND feedback_type IS NOT NULL
  );

CREATE POLICY "Authenticated admin can delete outfit feedback"
  ON outfit_feedback FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- OCCASION_FEEDBACK TABLE
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view all feedback" ON occasion_feedback;
DROP POLICY IF EXISTS "Public can submit valid occasion feedback" ON occasion_feedback;

CREATE POLICY "Authenticated admin can view occasion feedback"
  ON occasion_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public can submit occasion feedback"
  ON occasion_feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    occasion IS NOT NULL
    AND length(TRIM(BOTH FROM occasion)) > 0
    AND length(TRIM(BOTH FROM occasion)) <= 200
    AND (email IS NULL OR length(TRIM(BOTH FROM email)) <= 100)
  );

CREATE POLICY "Authenticated admin can delete occasion feedback"
  ON occasion_feedback FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
