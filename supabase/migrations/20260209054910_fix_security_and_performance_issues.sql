/*
  # Fix security and performance issues

  1. Index Changes
    - Add index on `saved_outfits.outfit_id` to cover the foreign key
    - Drop unused index `idx_render_jobs_status` on `render_jobs`
    - Drop unused index `idx_render_jobs_created_at` on `render_jobs`

  2. RLS Policy Performance Fixes
    - Replace `auth.uid()` with `(select auth.uid())` in all RLS policies
      to prevent re-evaluation per row (Auth RLS Initialization Plan)
    - Affected tables: products, outfits, outfit_items, render_jobs,
      outfit_feedback, occasion_feedback, saved_outfits

  3. Notes
    - Leaked Password Protection must be enabled via Supabase Dashboard
*/

-- =============================================
-- 1. ADD MISSING INDEX ON saved_outfits.outfit_id
-- =============================================
CREATE INDEX IF NOT EXISTS idx_saved_outfits_outfit_id
  ON saved_outfits (outfit_id);

-- =============================================
-- 2. DROP UNUSED INDEXES ON render_jobs
-- =============================================
DROP INDEX IF EXISTS idx_render_jobs_status;
DROP INDEX IF EXISTS idx_render_jobs_created_at;

-- =============================================
-- 3. FIX RLS POLICIES - PRODUCTS
-- =============================================
DROP POLICY IF EXISTS "Authenticated admin can insert products" ON products;
CREATE POLICY "Authenticated admin can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated admin can update products" ON products;
CREATE POLICY "Authenticated admin can update products"
  ON products FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated admin can delete products" ON products;
CREATE POLICY "Authenticated admin can delete products"
  ON products FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- =============================================
-- 4. FIX RLS POLICIES - OUTFITS
-- =============================================
DROP POLICY IF EXISTS "Authenticated admin can insert outfits" ON outfits;
CREATE POLICY "Authenticated admin can insert outfits"
  ON outfits FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated admin can update outfits" ON outfits;
CREATE POLICY "Authenticated admin can update outfits"
  ON outfits FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated admin can delete outfits" ON outfits;
CREATE POLICY "Authenticated admin can delete outfits"
  ON outfits FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- =============================================
-- 5. FIX RLS POLICIES - OUTFIT_ITEMS
-- =============================================
DROP POLICY IF EXISTS "Authenticated admin can insert outfit items" ON outfit_items;
CREATE POLICY "Authenticated admin can insert outfit items"
  ON outfit_items FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated admin can update outfit items" ON outfit_items;
CREATE POLICY "Authenticated admin can update outfit items"
  ON outfit_items FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated admin can delete outfit items" ON outfit_items;
CREATE POLICY "Authenticated admin can delete outfit items"
  ON outfit_items FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- =============================================
-- 6. FIX RLS POLICIES - RENDER_JOBS
-- =============================================
DROP POLICY IF EXISTS "Authenticated admin can insert render jobs" ON render_jobs;
CREATE POLICY "Authenticated admin can insert render jobs"
  ON render_jobs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated admin can update render jobs" ON render_jobs;
CREATE POLICY "Authenticated admin can update render jobs"
  ON render_jobs FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated admin can delete render jobs" ON render_jobs;
CREATE POLICY "Authenticated admin can delete render jobs"
  ON render_jobs FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- =============================================
-- 7. FIX RLS POLICIES - OUTFIT_FEEDBACK
-- =============================================
DROP POLICY IF EXISTS "Authenticated admin can delete outfit feedback" ON outfit_feedback;
CREATE POLICY "Authenticated admin can delete outfit feedback"
  ON outfit_feedback FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- =============================================
-- 8. FIX RLS POLICIES - OCCASION_FEEDBACK
-- =============================================
DROP POLICY IF EXISTS "Authenticated admin can view occasion feedback" ON occasion_feedback;
CREATE POLICY "Authenticated admin can view occasion feedback"
  ON occasion_feedback FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated admin can delete occasion feedback" ON occasion_feedback;
CREATE POLICY "Authenticated admin can delete occasion feedback"
  ON occasion_feedback FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- =============================================
-- 9. FIX RLS POLICIES - SAVED_OUTFITS
-- =============================================
DROP POLICY IF EXISTS "Users can view own saved outfits" ON saved_outfits;
CREATE POLICY "Users can view own saved outfits"
  ON saved_outfits FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can save outfits" ON saved_outfits;
CREATE POLICY "Users can save outfits"
  ON saved_outfits FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can unsave outfits" ON saved_outfits;
CREATE POLICY "Users can unsave outfits"
  ON saved_outfits FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);