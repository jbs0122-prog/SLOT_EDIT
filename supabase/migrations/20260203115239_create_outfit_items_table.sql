/*
  # Create outfit_items table - Junction table linking outfits to products

  1. New Tables
    - `outfit_items`
      - `id` (uuid, primary key) - Unique item identifier
      - `outfit_id` (text, NOT NULL) - Foreign key to outfits table
      - `product_id` (uuid, NOT NULL) - Foreign key to products table
      - `slot_type` (text, NOT NULL) - Item slot: outer, top, bottom, shoes, bag, accessory
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on `outfit_items` table
    - Add policy for public read access (all users can view outfit items)

  3. Foreign Keys
    - outfit_id references outfits(id) with CASCADE delete
    - product_id references products(id) with CASCADE delete

  4. Indexes
    - Index on outfit_id for fast outfit item lookups
    - Index on product_id for reverse product usage lookups

  5. Notes
    - This table enables the new product-based outfit system
    - Each outfit can have multiple items (one per slot)
    - Slot types: outer, top, bottom, shoes, bag, accessory
    - Cascading deletes keep data integrity
    - outfit_id is text type to match existing outfits table
*/

CREATE TABLE IF NOT EXISTS outfit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id text NOT NULL,
  product_id uuid NOT NULL,
  slot_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_outfit FOREIGN KEY (outfit_id) REFERENCES outfits(id) ON DELETE CASCADE,
  CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view outfit items"
  ON outfit_items
  FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_outfit_items_outfit_id ON outfit_items(outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_items_product_id ON outfit_items(product_id);
