/*
  # Add Matching Fields to Products Table

  ## Overview
  Adds sophisticated matching fields to the products table to enable intelligent outfit generation.
  These fields allow the system to automatically create well-coordinated outfits based on color theory,
  style compatibility, and formality levels.

  ## New Columns

  ### Color Matching
  - `color_family` (text with constraint)
    - Normalized color categories for precise color matching
    - Values: black, white, grey, navy, beige, brown, blue, green, red, yellow, purple, pink, orange, metallic, multi
    - Used for: Color harmony rules, neutral vs accent classification
  
  - `color_tone` (text with constraint)
    - Temperature classification for advanced color coordination
    - Values: warm, cool, neutral
    - Used for: Tone-on-tone matching, preventing clashing combinations

  ### Style Matching
  - `sub_category` (text)
    - Detailed categorization within main category
    - Examples: 
      - outer: puffer, coat, blazer, jacket, cardigan, trench
      - top: tshirt, shirt, knit, hoodie, sweatshirt, turtleneck
      - bottom: denim, slacks, chinos, jogger, cargo, shorts
      - shoes: sneaker, derby, loafer, boot, runner
      - bag: tote, backpack, crossbody, duffle
      - accessory: belt, cap, scarf, glove, watch
    - Used for: Style consistency, formality matching
  
  - `pattern` (text with constraint)
    - Pattern classification for visual balance
    - Values: solid, stripe, check, graphic, print, other
    - Used for: Preventing pattern overload, creating visual hierarchy

  ### Formality & Seasonality
  - `formality` (integer 1-5)
    - Formality level for outfit consistency
    - 1 = Very casual (gym wear, loungewear)
    - 2 = Casual (streetwear, everyday)
    - 3 = Smart casual (business casual)
    - 4 = Semi-formal (dressy)
    - 5 = Formal (suit, dress shoes)
    - Used for: Ensuring all items in outfit have compatible formality levels
  
  - `warmth` (integer 1-5)
    - Insulation/warmth level for seasonal matching
    - 1 = Summer (tank tops, shorts, sandals)
    - 2 = Spring/Fall light (t-shirts, light jackets)
    - 3 = Transitional (long sleeves, medium layers)
    - 4 = Cold weather (sweaters, coats)
    - 5 = Winter (heavy coats, insulated boots)
    - Used for: Seasonal appropriateness, temperature-based outfit generation

  ## Migration Safety
  - All new columns are nullable (existing data unaffected)
  - Constraints use CHECK to ensure data integrity
  - No default values to avoid masking data quality issues
*/

-- Add color matching fields
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS color_family TEXT 
CHECK (color_family IN (
  'black', 'white', 'grey', 'navy', 'beige', 'brown',
  'blue', 'green', 'red', 'yellow', 'purple', 'pink', 
  'orange', 'metallic', 'multi'
));

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS color_tone TEXT 
CHECK (color_tone IN ('warm', 'cool', 'neutral'));

-- Add style matching fields
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sub_category TEXT;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS pattern TEXT 
CHECK (pattern IN ('solid', 'stripe', 'check', 'graphic', 'print', 'other'));

-- Add formality and seasonality fields
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS formality INTEGER 
CHECK (formality >= 1 AND formality <= 5);

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS warmth INTEGER 
CHECK (warmth >= 1 AND warmth <= 5);

-- Add comments for documentation
COMMENT ON COLUMN products.color_family IS 'Normalized color category for matching (black, white, grey, navy, beige, brown, blue, green, red, yellow, purple, pink, orange, metallic, multi)';
COMMENT ON COLUMN products.color_tone IS 'Color temperature classification (warm, cool, neutral)';
COMMENT ON COLUMN products.sub_category IS 'Detailed style category (e.g., tshirt, denim, sneaker)';
COMMENT ON COLUMN products.pattern IS 'Pattern type (solid, stripe, check, graphic, print, other)';
COMMENT ON COLUMN products.formality IS 'Formality level 1-5 (1=very casual, 5=formal)';
COMMENT ON COLUMN products.warmth IS 'Warmth/insulation level 1-5 (1=summer, 5=winter)';
