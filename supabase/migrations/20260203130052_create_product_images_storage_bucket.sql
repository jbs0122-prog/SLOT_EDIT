/*
  # Create Storage Bucket for Product Images

  1. New Storage Bucket
    - `product-images` bucket for storing product images
    - Public access enabled for reading images
    - Maximum file size: 5MB
    - Allowed file types: image/jpeg, image/png, image/webp, image/gif

  2. Security Policies
    - Allow public read access to all images
    - Allow anonymous users to upload images (for admin)
    - Allow anonymous users to update/delete their uploads
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload for product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow update for product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete for product images" ON storage.objects;

-- Allow public read access to all images
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Allow anyone to upload images (admin use)
CREATE POLICY "Allow upload for product images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'product-images');

-- Allow anyone to update images
CREATE POLICY "Allow update for product images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'product-images');

-- Allow anyone to delete images
CREATE POLICY "Allow delete for product images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'product-images');