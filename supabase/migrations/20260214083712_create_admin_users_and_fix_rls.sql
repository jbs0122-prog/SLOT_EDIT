/*
  # Create admin role system and fix all RLS policies

  1. New Tables
    - `admin_users`
      - `user_id` (uuid, primary key, references auth.users)
      - `created_at` (timestamptz)

  2. New Functions
    - `is_admin()` - SECURITY DEFINER function that checks if current user is in admin_users table

  3. Seed Data
    - Existing users with @admin.com emails are seeded into admin_users

  4. RLS Policy Fixes
    - All write policies on products, outfits, outfit_items, render_jobs now use is_admin()
    - Previously any authenticated user could write; now only admins can
    - All delete policies on feedback tables now use is_admin()
    - All view policies on occasion_feedback now use is_admin()
    - Storage policies updated to use is_admin()

  5. Security
    - admin_users table has RLS enabled with admin-only access
    - is_admin() uses SECURITY DEFINER to bypass RLS when checking admin_users
    - STABLE marking for performance optimization in RLS checks
*/

-- =============================================
-- 1. CREATE ADMIN_USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. CREATE is_admin() FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid())
  );
$$;

-- =============================================
-- 3. SEED EXISTING ADMIN USERS
-- =============================================
INSERT INTO admin_users (user_id)
SELECT id FROM auth.users WHERE email LIKE '%@admin.com'
ON CONFLICT (user_id) DO NOTHING;

-- =============================================
-- 4. ADMIN_USERS TABLE RLS POLICIES
-- =============================================
CREATE POLICY "Only admins can view admin_users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- =============================================
-- 5. FIX PRODUCTS RLS - require is_admin() for writes
-- =============================================
DROP POLICY IF EXISTS "Authenticated admin can insert products" ON products;
CREATE POLICY "Admin can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated admin can update products" ON products;
CREATE POLICY "Admin can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated admin can delete products" ON products;
CREATE POLICY "Admin can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================
-- 6. FIX OUTFITS RLS - require is_admin() for writes
-- =============================================
DROP POLICY IF EXISTS "Authenticated admin can insert outfits" ON outfits;
CREATE POLICY "Admin can insert outfits"
  ON outfits FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated admin can update outfits" ON outfits;
CREATE POLICY "Admin can update outfits"
  ON outfits FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated admin can delete outfits" ON outfits;
CREATE POLICY "Admin can delete outfits"
  ON outfits FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================
-- 7. FIX OUTFIT_ITEMS RLS - require is_admin() for writes
-- =============================================
DROP POLICY IF EXISTS "Authenticated admin can insert outfit items" ON outfit_items;
CREATE POLICY "Admin can insert outfit items"
  ON outfit_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated admin can update outfit items" ON outfit_items;
CREATE POLICY "Admin can update outfit items"
  ON outfit_items FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated admin can delete outfit items" ON outfit_items;
CREATE POLICY "Admin can delete outfit items"
  ON outfit_items FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================
-- 8. FIX RENDER_JOBS RLS - require is_admin() for writes
-- =============================================
DROP POLICY IF EXISTS "Authenticated admin can insert render jobs" ON render_jobs;
CREATE POLICY "Admin can insert render jobs"
  ON render_jobs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated admin can update render jobs" ON render_jobs;
CREATE POLICY "Admin can update render jobs"
  ON render_jobs FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated admin can delete render jobs" ON render_jobs;
CREATE POLICY "Admin can delete render jobs"
  ON render_jobs FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================
-- 9. FIX FEEDBACK RLS - require is_admin() for admin operations
-- =============================================
DROP POLICY IF EXISTS "Authenticated admin can delete outfit feedback" ON outfit_feedback;
CREATE POLICY "Admin can delete outfit feedback"
  ON outfit_feedback FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated admin can view occasion feedback" ON occasion_feedback;
CREATE POLICY "Admin can view occasion feedback"
  ON occasion_feedback FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated admin can delete occasion feedback" ON occasion_feedback;
CREATE POLICY "Admin can delete occasion feedback"
  ON occasion_feedback FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================
-- 10. FIX STORAGE POLICIES - require is_admin() for writes
-- =============================================
DROP POLICY IF EXISTS "Authenticated admin can upload product images" ON storage.objects;
CREATE POLICY "Admin can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Authenticated admin can update product images" ON storage.objects;
CREATE POLICY "Admin can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Authenticated admin can delete product images" ON storage.objects;
CREATE POLICY "Admin can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());
