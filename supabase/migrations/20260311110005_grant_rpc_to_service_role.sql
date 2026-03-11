/*
  # Grant RPC Functions to service_role

  The 4 atomic increment functions for learning tables were only granted
  to `authenticated`. Edge Functions running with service_role key need
  explicit GRANT to call them via db.rpc().

  Functions updated:
    - increment_vibe_expansion_success
    - increment_vibe_expansion_fail
    - increment_keyword_accepted
    - increment_keyword_total
*/

GRANT EXECUTE ON FUNCTION increment_vibe_expansion_success TO service_role;
GRANT EXECUTE ON FUNCTION increment_vibe_expansion_fail TO service_role;
GRANT EXECUTE ON FUNCTION increment_keyword_accepted TO service_role;
GRANT EXECUTE ON FUNCTION increment_keyword_total TO service_role;
