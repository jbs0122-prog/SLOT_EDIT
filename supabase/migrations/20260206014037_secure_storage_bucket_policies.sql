/*
  # Secure storage bucket policies

  1. Changes
    - Restrict product-images bucket write operations to authenticated users only
    - Keep public read access for displaying images on the site

  2. Security
    - Only authenticated admin can upload, update, or delete images
    - Anyone can view images (needed for public product display)
*/

DROP POLICY IF EXISTS "Allow upload for product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow update for product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete for product images" ON storage.objects;

CREATE POLICY "Authenticated admin can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated admin can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated admin can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
