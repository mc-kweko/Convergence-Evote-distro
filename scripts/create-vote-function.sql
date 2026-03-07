-- Create atomic vote count increment function
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION increment_vote_count(candidate_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE candidates
  SET vote_count = COALESCE(vote_count, 0) + 1
  WHERE id = candidate_id;
END;
$$;
