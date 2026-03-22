-- ============================================
-- CONVERGENCE E-VOTE - FINAL SETUP
-- Run this ONCE before the election
-- ============================================

-- 1. FIX TIMESTAMP COLUMNS (Critical for timer accuracy)
ALTER TABLE election_stats 
  ALTER COLUMN started_at TYPE timestamptz USING started_at AT TIME ZONE 'UTC',
  ALTER COLUMN ended_at TYPE timestamptz USING ended_at AT TIME ZONE 'UTC';

-- 2. CREATE PERFORMANCE INDEXES (Critical for speed)
CREATE INDEX IF NOT EXISTS idx_election_stats_is_active ON election_stats(is_active);
CREATE INDEX IF NOT EXISTS idx_election_stats_created_at ON election_stats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_student_id ON votes(student_id);
CREATE INDEX IF NOT EXISTS idx_votes_position_id ON votes(position_id);
CREATE INDEX IF NOT EXISTS idx_positions_is_active ON positions(is_active);
CREATE INDEX IF NOT EXISTS idx_candidates_position_id ON candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_students_pin ON students(pin);
CREATE INDEX IF NOT EXISTS idx_students_has_voted ON students(has_voted);

-- 3. CREATE ATOMIC VOTE INCREMENT FUNCTION (Critical for vote counting)
CREATE OR REPLACE FUNCTION increment_vote_count(candidate_id UUID, school_id_input UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF school_id_input IS NULL THEN
    UPDATE candidates
    SET vote_count = COALESCE(vote_count, 0) + 1
    WHERE id = candidate_id;
  ELSE
    UPDATE candidates
    SET vote_count = COALESCE(vote_count, 0) + 1
    WHERE id = candidate_id AND school_id = school_id_input;
  END IF;
END;
$$;

-- 4. RESET SYSTEM FOR NEW ELECTION (Optional - only if needed)
-- Uncomment the lines below if you need to reset the system

-- UPDATE students SET has_voted = false, voted_at = NULL;
-- UPDATE candidates SET vote_count = 0;
-- UPDATE election_stats SET is_active = false;
-- DELETE FROM votes;

-- 5. VERIFY SETUP
SELECT 
  'Timestamp columns' as check_item,
  CASE 
    WHEN data_type = 'timestamp with time zone' THEN '✓ PASS'
    ELSE '✗ FAIL - Run ALTER TABLE commands'
  END as status
FROM information_schema.columns
WHERE table_name = 'election_stats' AND column_name = 'started_at'

UNION ALL

SELECT 
  'Performance indexes' as check_item,
  CASE 
    WHEN COUNT(*) >= 8 THEN '✓ PASS'
    ELSE '✗ FAIL - Run CREATE INDEX commands'
  END as status
FROM pg_indexes
WHERE indexname LIKE 'idx_%'

UNION ALL

SELECT 
  'Vote count function' as check_item,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL - Run CREATE FUNCTION command'
  END as status
FROM pg_proc
WHERE proname = 'increment_vote_count';

-- ============================================
-- SETUP COMPLETE!
-- If all checks show ✓ PASS, you're ready!
-- ============================================

