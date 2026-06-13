-- ============================================================
-- OMICRON SCHOOL VOTE — Security & Schema Upgrade Migration
-- Run this ONCE after the existing schema is in place.
-- ============================================================

-- 1. Add pin_hash column (bcrypt hash storage) alongside existing pin column
--    We keep pin temporarily so the admin dashboard still works during transition.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);

-- 2. Rate-limiting table for PIN attempts
CREATE TABLE IF NOT EXISTS pin_rate_limits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier   VARCHAR(255) NOT NULL,  -- ip_address OR student_id
  attempt_type VARCHAR(50)  NOT NULL,  -- 'ip' | 'student'
  attempts     INTEGER      NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_until TIMESTAMP WITH TIME ZONE,
  school_id    UUID REFERENCES schools(id) ON DELETE CASCADE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pin_rate_limits_identifier ON pin_rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_pin_rate_limits_locked_until ON pin_rate_limits(locked_until);
CREATE INDEX IF NOT EXISTS idx_pin_rate_limits_window_start ON pin_rate_limits(window_start);

-- 3. Voter receipt table (optional verification without revealing choice)
CREATE TABLE IF NOT EXISTS voter_receipts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_hash   VARCHAR(255) UNIQUE NOT NULL,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_voter_receipts_vote_hash ON voter_receipts(vote_hash);
CREATE INDEX IF NOT EXISTS idx_voter_receipts_school_id ON voter_receipts(school_id);

-- 4. Ensure election_stats.portal_live flag resets on election stop
--    (handled in application code, but index helps the query)
CREATE INDEX IF NOT EXISTS idx_schools_portal_live ON schools(portal_live);

-- 5. Ensure students pin_hash is indexed for fast lookup
CREATE INDEX IF NOT EXISTS idx_students_pin_hash ON students(pin_hash);

-- 6. Add school_id to pin_rate_limits if missing  
ALTER TABLE pin_rate_limits
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT
  'pin_hash column'        AS check_item,
  CASE WHEN COUNT(*) > 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'pin_hash'

UNION ALL

SELECT
  'pin_rate_limits table'  AS check_item,
  CASE WHEN COUNT(*) > 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM information_schema.tables
WHERE table_name = 'pin_rate_limits'

UNION ALL

SELECT
  'voter_receipts table'   AS check_item,
  CASE WHEN COUNT(*) > 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM information_schema.tables
WHERE table_name = 'voter_receipts';
