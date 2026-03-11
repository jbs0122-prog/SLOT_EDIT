/*
  # Learning Table RPC Functions

  Adds atomic increment functions for vibe_item_expansions and keyword_performance
  so concurrent pipeline runs don't overwrite each other's feedback counts.

  Functions:
    - increment_vibe_expansion_success(p_vibe, p_look, p_slot, p_item)
    - increment_vibe_expansion_fail(p_vibe, p_look, p_slot, p_item)
    - increment_keyword_accepted(p_keyword, p_vibe, p_slot, p_season)
    - increment_keyword_total(p_keyword, p_vibe, p_slot, p_season)

  Also adds season column to keyword_performance if missing.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'keyword_performance' AND column_name = 'season'
  ) THEN
    ALTER TABLE keyword_performance ADD COLUMN season text NOT NULL DEFAULT '';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION increment_vibe_expansion_success(
  p_vibe text, p_look text, p_slot text, p_item text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO vibe_item_expansions (vibe, look, slot, item_name, source, success_count, fail_count, score)
  VALUES (p_vibe, p_look, p_slot, p_item, 'feedback', 1, 0, 1.0)
  ON CONFLICT (vibe, look, slot, item_name) DO UPDATE SET
    success_count = vibe_item_expansions.success_count + 1,
    score = CASE
      WHEN (vibe_item_expansions.success_count + 1 + vibe_item_expansions.fail_count) = 0 THEN 0
      ELSE (vibe_item_expansions.success_count + 1)::float /
           (vibe_item_expansions.success_count + 1 + vibe_item_expansions.fail_count)::float
    END;
END;
$$;

CREATE OR REPLACE FUNCTION increment_vibe_expansion_fail(
  p_vibe text, p_look text, p_slot text, p_item text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO vibe_item_expansions (vibe, look, slot, item_name, source, success_count, fail_count, score)
  VALUES (p_vibe, p_look, p_slot, p_item, 'feedback', 0, 1, 0.0)
  ON CONFLICT (vibe, look, slot, item_name) DO UPDATE SET
    fail_count = vibe_item_expansions.fail_count + 1,
    score = CASE
      WHEN (vibe_item_expansions.success_count + vibe_item_expansions.fail_count + 1) = 0 THEN 0
      ELSE vibe_item_expansions.success_count::float /
           (vibe_item_expansions.success_count + vibe_item_expansions.fail_count + 1)::float
    END;
END;
$$;

CREATE OR REPLACE FUNCTION increment_keyword_accepted(
  p_keyword text, p_vibe text, p_slot text, p_season text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO keyword_performance (keyword, vibe, slot, season, accepted_count, total_count, score)
  VALUES (p_keyword, p_vibe, p_slot, p_season, 1, 1, 1.0)
  ON CONFLICT (keyword, vibe, slot) DO UPDATE SET
    accepted_count = COALESCE(keyword_performance.accepted_count, 0) + 1,
    total_count    = COALESCE(keyword_performance.total_count, 0) + 1,
    score = CASE
      WHEN (COALESCE(keyword_performance.total_count, 0) + 1) = 0 THEN 0
      ELSE (COALESCE(keyword_performance.accepted_count, 0) + 1)::float /
           (COALESCE(keyword_performance.total_count, 0) + 1)::float
    END;
END;
$$;

CREATE OR REPLACE FUNCTION increment_keyword_total(
  p_keyword text, p_vibe text, p_slot text, p_season text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO keyword_performance (keyword, vibe, slot, season, accepted_count, total_count, score)
  VALUES (p_keyword, p_vibe, p_slot, p_season, 0, 1, 0.0)
  ON CONFLICT (keyword, vibe, slot) DO UPDATE SET
    total_count = COALESCE(keyword_performance.total_count, 0) + 1,
    score = CASE
      WHEN (COALESCE(keyword_performance.total_count, 0) + 1) = 0 THEN 0
      ELSE COALESCE(keyword_performance.accepted_count, 0)::float /
           (COALESCE(keyword_performance.total_count, 0) + 1)::float
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_vibe_expansion_success TO authenticated;
GRANT EXECUTE ON FUNCTION increment_vibe_expansion_fail TO authenticated;
GRANT EXECUTE ON FUNCTION increment_keyword_accepted TO authenticated;
GRANT EXECUTE ON FUNCTION increment_keyword_total TO authenticated;
