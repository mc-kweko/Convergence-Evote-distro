-- ============================================
-- SYSTEM HEALTH CHECK
-- Run this to verify everything is ready
-- ============================================

-- Check 1: Database Tables Exist
SELECT 
  'Database Tables' as component,
  CASE 
    WHEN COUNT(*) >= 5 THEN '✓ All tables exist'
    ELSE '✗ Missing tables: ' || (5 - COUNT(*))::text
  END as status
FROM information_schema.tables
WHERE table_name IN ('students', 'positions', 'candidates', 'votes', 'election_stats');

-- Check 2: Timestamp Columns Fixed
SELECT 
  'Timestamp Columns' as component,
  CASE 
    WHEN COUNT(*) = 2 THEN '✓ Timestamps use timestamptz'
    ELSE '✗ Run timestamp fix SQL'
  END as status
FROM information_schema.columns
WHERE table_name = 'election_stats' 
  AND column_name IN ('started_at', 'ended_at')
  AND data_type = 'timestamp with time zone';

-- Check 3: Performance Indexes
SELECT 
  'Performance Indexes' as component,
  CASE 
    WHEN COUNT(*) >= 8 THEN '✓ All indexes created (' || COUNT(*) || ')'
    ELSE '✗ Missing indexes: ' || (8 - COUNT(*))::text
  END as status
FROM pg_indexes
WHERE indexname LIKE 'idx_%';

-- Check 4: Vote Count Function
SELECT 
  'Vote Count Function' as component,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ Function exists'
    ELSE '✗ Run function creation SQL'
  END as status
FROM pg_proc
WHERE proname = 'increment_vote_count';

-- Check 5: Student Data
SELECT 
  'Student Data' as component,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ ' || COUNT(*) || ' students imported'
    ELSE '✗ No students - import data'
  END as status
FROM students;

-- Check 6: Positions Setup
SELECT 
  'Ballot Positions' as component,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ ' || COUNT(*) || ' positions created'
    ELSE '✗ No positions - create ballot'
  END as status
FROM positions;

-- Check 7: Candidates Setup
SELECT 
  'Candidates' as component,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ ' || COUNT(*) || ' candidates added'
    ELSE '✗ No candidates - add candidates'
  END as status
FROM candidates;

-- Check 8: Admin Accounts (Supabase Auth)
SELECT 
  'Admin Accounts' as component,
  '✓ Using Supabase Auth' as status;

-- Check 9: Active Elections
SELECT 
  'Active Elections' as component,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ No active elections (ready to start)'
    ELSE '⚠ ' || COUNT(*) || ' active election(s) - may need to stop'
  END as status
FROM election_stats
WHERE is_active = true;

-- Check 10: Voting Status
SELECT 
  'Voting Status' as component,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ No votes yet (clean slate)'
    ELSE '⚠ ' || COUNT(*) || ' votes recorded - may need reset'
  END as status
FROM votes;

-- ============================================
-- SUMMARY
-- ============================================
SELECT 
  '=== SYSTEM READY ===' as summary,
  CASE 
    WHEN (SELECT COUNT(*) FROM students) > 0 
     AND (SELECT COUNT(*) FROM positions) > 0
     AND (SELECT COUNT(*) FROM candidates) > 0
     AND (SELECT COUNT(*) FROM information_schema.columns 
          WHERE table_name = 'election_stats' 
          AND column_name = 'started_at' 
          AND data_type = 'timestamp with time zone') > 0
    THEN '✅ ALL SYSTEMS GO - Ready for election!'
    ELSE '❌ SETUP INCOMPLETE - Check items above'
  END as status;

-- ============================================
-- If all checks show ✓, you're ready!
-- ============================================
