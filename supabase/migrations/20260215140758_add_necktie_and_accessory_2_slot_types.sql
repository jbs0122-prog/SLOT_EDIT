/*
  # Add necktie category and accessory_2 slot type

  1. New Slot Types
    - `necktie` - New product category and outfit slot for neckties, bowties, scarf ties
    - `accessory_2` - Second accessory slot allowing outfits to include up to 2 accessories

  2. Changes
    - No schema changes needed (slot_type and category are text columns without CHECK constraints)
    - This migration serves as documentation of the expanded slot system

  3. Updated Slot Hierarchy
    - outer: coats, puffers, jackets, trench coats
    - mid: knits, cardigans, sweaters, vests, fleece
    - top: shirts, t-shirts, base layer tops
    - bottom: pants, skirts, shorts
    - shoes: all footwear
    - bag: bags and carriers
    - accessory: primary accessory (belts, caps, scarves, watches, gloves)
    - accessory_2: secondary accessory (same types as accessory, optional)
    - necktie: neckties, bowties, scarf ties

  4. Layout Changes
    - Flatlay renderer now uses fixed bounding boxes per slot type
    - Each slot has a defined center position and max width/height on the canvas
    - Images are scaled to fit (contain) within their bounding box while preserving aspect ratio
    - This ensures consistent sizing regardless of source image resolution

  5. Important Notes
    - Existing outfits with `accessory` slot continue to work unchanged
    - The matching engine now supports picking 2 accessories (40% chance for second)
    - Necktie products have 50% inclusion probability in auto-generated outfits
    - Necktie is treated as a formal sub-category in style matching
*/

SELECT 1;
