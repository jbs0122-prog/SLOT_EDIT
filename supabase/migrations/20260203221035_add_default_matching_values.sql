/*
  # Set Default Matching Values for Existing Products

  ## Overview
  Updates existing products with sensible default values for matching optimization fields.
  This ensures that all products can be used in automated outfit generation even if
  detailed matching information hasn't been manually entered yet.

  ## Changes
  1. Set default formality = 3 (smart casual) for products without formality
  2. Set default warmth = 3 (transitional/spring-fall) for products without warmth  
  3. Set default pattern = 'solid' for products without pattern
  4. Set default color_tone = 'neutral' for products without color_tone
  5. Set intelligent color_family defaults based on existing color field

  ## Safety
  - Only updates NULL values, doesn't overwrite existing data
  - Uses CASE statements for conditional updates
  - All changes are reversible
*/

-- Update formality: default to 3 (smart casual) if not set
UPDATE products
SET formality = 3
WHERE formality IS NULL;

-- Update warmth: default to 3 (transitional) if not set
UPDATE products
SET warmth = 3
WHERE warmth IS NULL;

-- Update pattern: default to 'solid' if not set
UPDATE products
SET pattern = 'solid'
WHERE pattern IS NULL;

-- Update color_tone: default to 'neutral' if not set
UPDATE products
SET color_tone = 'neutral'
WHERE color_tone IS NULL;

-- Update color_family: use intelligent defaults based on color field
UPDATE products
SET color_family = CASE
  WHEN color ILIKE '%black%' THEN 'black'
  WHEN color ILIKE '%white%' OR color ILIKE '%cream%' THEN 'white'
  WHEN color ILIKE '%gray%' OR color ILIKE '%grey%' THEN 'grey'
  WHEN color ILIKE '%navy%' THEN 'navy'
  WHEN color ILIKE '%beige%' OR color ILIKE '%tan%' OR color ILIKE '%khaki%' THEN 'beige'
  WHEN color ILIKE '%brown%' THEN 'brown'
  WHEN color ILIKE '%blue%' THEN 'blue'
  WHEN color ILIKE '%green%' THEN 'green'
  WHEN color ILIKE '%red%' THEN 'red'
  WHEN color ILIKE '%yellow%' THEN 'yellow'
  WHEN color ILIKE '%purple%' OR color ILIKE '%violet%' THEN 'purple'
  WHEN color ILIKE '%pink%' THEN 'pink'
  WHEN color ILIKE '%orange%' THEN 'orange'
  ELSE 'grey'
END
WHERE color_family IS NULL AND color IS NOT NULL AND color != '';

-- For products with no color info at all, default to grey
UPDATE products
SET color_family = 'grey'
WHERE color_family IS NULL;
