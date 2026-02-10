/*
  # Expand color_family check constraint

  1. Modified Tables
    - `products`
      - Drops old `products_color_family_check` constraint (15 colors)
      - Adds new constraint with 33 expanded color families
      - New colors: khaki, cream, ivory, burgundy, wine, olive, mustard, coral,
        charcoal, tan, camel, rust, sage, mint, lavender, teal, sky_blue, denim

  2. Data Updates
    - Updates khaki products: color_family "green" -> "khaki"
    - Updates burgundy products: color_family "red" -> "burgundy"

  3. Important Notes
    - No data loss; only constraint expansion and value correction
    - Existing valid values remain valid under new constraint
*/

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_color_family_check;

ALTER TABLE products ADD CONSTRAINT products_color_family_check CHECK (
  color_family = ANY (ARRAY[
    'black', 'white', 'grey', 'navy', 'beige', 'brown',
    'blue', 'green', 'red', 'yellow', 'purple', 'pink',
    'orange', 'metallic', 'multi',
    'khaki', 'cream', 'ivory', 'burgundy', 'wine', 'olive',
    'mustard', 'coral', 'charcoal', 'tan', 'camel', 'rust',
    'sage', 'mint', 'lavender', 'teal', 'sky_blue', 'denim'
  ])
);

UPDATE products SET color_family = 'khaki' WHERE color = '카키' AND color_family = 'green';
UPDATE products SET color_family = 'burgundy' WHERE color = '버건디' AND color_family = 'red';