/*
  # Create products table - Fashion Item Catalog

  1. New Tables
    - `products`
      - `id` (uuid, primary key) - Unique product identifier
      - `brand` (text) - Brand name (e.g., "Zara", "Nike")
      - `name` (text, NOT NULL) - Product name
      - `category` (text, NOT NULL) - Item category: outer, top, bottom, shoes, bag, accessory
      - `gender` (text, NOT NULL) - MALE, FEMALE, or UNISEX
      - `body_type` (text[]) - Body type tags (e.g., ["slim", "athletic"])
      - `vibe` (text[]) - Style vibe tags (e.g., ["casual", "street"])
      - `color` (text) - Primary color
      - `season` (text[]) - Seasonal tags (e.g., ["spring", "summer"])
      - `silhouette` (text) - Silhouette style (e.g., "oversized", "fitted")
      - `image_url` (text, NOT NULL) - Product image URL
      - `product_link` (text) - Shopping link
      - `price` (integer) - Price in KRW
      - `stock_status` (text) - in_stock, out_of_stock, coming_soon
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `products` table
    - Add policy for public read access (all users can view products)
    - Admin updates handled separately (not in this migration)

  3. Indexes
    - Index on category for fast filtering
    - Index on gender for filtering by gender
    - Index on stock_status for active product queries

  4. Notes
    - Using text[] arrays for multi-value fields (body_type, vibe, season)
    - All users can read products (public catalog)
    - Category values: outer, top, bottom, shoes, bag, accessory
    - Gender values: MALE, FEMALE, UNISEX
    - Stock status values: in_stock, out_of_stock, coming_soon
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text DEFAULT '',
  name text NOT NULL,
  category text NOT NULL,
  gender text NOT NULL,
  body_type text[] DEFAULT '{}',
  vibe text[] DEFAULT '{}',
  color text DEFAULT '',
  season text[] DEFAULT '{}',
  silhouette text DEFAULT '',
  image_url text NOT NULL,
  product_link text DEFAULT '',
  price integer DEFAULT NULL,
  stock_status text DEFAULT 'in_stock',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products"
  ON products
  FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_gender ON products(gender);
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(stock_status);
