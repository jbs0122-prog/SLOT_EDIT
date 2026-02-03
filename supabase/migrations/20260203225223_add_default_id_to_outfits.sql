/*
  # Add Default ID to Outfits Table

  ## Overview
  Adds a default value to the id column in the outfits table to automatically generate UUIDs.
  This fixes the "null value in column id violates not-null constraint" error.

  ## Changes
  1. Set default value for id column to auto-generate UUIDs

  ## Technical Details
  - Uses gen_random_uuid()::text to generate UUID strings
  - Ensures all new rows automatically get a unique ID
*/

-- Add default value for id column
ALTER TABLE outfits 
ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
