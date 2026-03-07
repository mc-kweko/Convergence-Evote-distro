# PRE-ELECTION CHECKLIST - MUST RUN BEFORE TOMORROW

## Critical Database Setup (Run in Supabase SQL Editor)

### 1. Fix Timestamp Columns (CRITICAL)
```sql
ALTER TABLE election_stats 
  ALTER COLUMN started_at TYPE timestamptz USING started_at AT TIME ZONE 'UTC',
  ALTER COLUMN ended_at TYPE timestamptz USING ended_at AT TIME ZONE 'UTC';
```

### 2. Add Performance Indexes (CRITICAL)
```sql
CREATE INDEX IF NOT EXISTS idx_election_stats_is_active ON election_stats(is_active);
CREATE INDEX IF NOT EXISTS idx_election_stats_created_at ON election_stats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_student_id ON votes(student_id);
CREATE INDEX IF NOT EXISTS idx_votes_position_id ON votes(position_id);
CREATE INDEX IF NOT EXISTS idx_positions_is_active ON positions(is_active);
CREATE INDEX IF NOT EXISTS idx_candidates_position_id ON candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_students_pin ON students(pin);
CREATE INDEX IF NOT EXISTS idx_students_has_voted ON students(has_voted);
```

### 3. Create Vote Count Function (CRITICAL)
```sql
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
```

## Pre-Election Verification

### Data Verification
- [ ] All students have valid 8-digit PINs
- [ ] All positions are marked as active (is_active = true)
- [ ] All candidates are marked as active (is_active = true)
- [ ] All candidates have correct position assignments
- [ ] Student count matches expected number
- [ ] No students marked as has_voted = true (reset if needed)

### System Verification
- [ ] Admin login works (test with both admin accounts)
- [ ] Student login blocked when voting not started
- [ ] Timer displays correctly on dashboard
- [ ] All positions show in ballot setup
- [ ] Candidate photos load correctly

### Reset Commands (if needed)
```sql
-- Reset all students voting status
UPDATE students SET has_voted = false, voted_at = NULL;

-- Reset all candidate vote counts
UPDATE candidates SET vote_count = 0;

-- Deactivate any active elections
UPDATE election_stats SET is_active = false;

-- Clear all votes (CAUTION: Only use before election)
DELETE FROM votes;
```

## Election Day Workflow

### 1. Before Students Arrive
- [ ] Verify all database scripts have been run
- [ ] Test admin login
- [ ] Verify ballot displays correctly
- [ ] Check that timer is NOT running
- [ ] Ensure all positions/candidates are active

### 2. Starting the Election
- [ ] Admin logs in to dashboard
- [ ] Navigate to Election Timer Control
- [ ] Enter voting duration in minutes (e.g., 60 for 1 hour)
- [ ] Click "Start Voting"
- [ ] Verify timer starts counting down
- [ ] Test one student login to confirm ballot loads

### 3. During Election
- [ ] Monitor timer on dashboard
- [ ] Check "Election Status" card for live vote counts
- [ ] If needed, use "Extend" to add more time
- [ ] Students can vote until timer reaches 0

### 4. Ending Election
- **Automatic**: Timer reaches 0, voting stops automatically
- **Manual**: Click "Stop Voting Now" button
- [ ] Verify timer shows "Voting is Inactive"
- [ ] Test that students cannot login anymore
- [ ] Generate results PDF from Results page

## Timing System Features

### Automatic Behaviors
✅ Timer counts down smoothly every second
✅ When timer reaches 0, voting automatically stops
✅ Students logged in are automatically logged out when time expires
✅ Expired elections are auto-deactivated on any API call
✅ Students cannot login when voting hasn't started or has ended

### Admin Controls
✅ Start voting with custom duration
✅ Extend voting time while active
✅ Stop voting immediately at any time
✅ Real-time countdown display

### Student Experience
✅ See countdown timer on ballot page
✅ Cannot login before voting starts
✅ Cannot login after voting ends
✅ Auto-logged out when time expires
✅ Cannot submit votes after time expires

## Performance Optimizations Applied

### Client-Side
- Local countdown timers (smooth 1-second updates)
- API polling reduced to every 3 seconds (67% fewer calls)
- Optimized React hooks and dependencies

### Server-Side
- Selective field queries (smaller payloads)
- Parallel database operations
- Auto-deactivation of expired elections
- Atomic vote count increments
- Database indexes for fast queries

### Expected Performance
- API response time: <200ms
- Database queries: <50ms
- Vote submission: <500ms
- Timer accuracy: ±1-2 seconds
- Zero lag on timer display

## Troubleshooting

### Timer shows 0h 0m 0s immediately after starting
- **Cause**: Timestamp timezone issue
- **Fix**: Run the timestamp fix SQL (step 1 above)

### Students can't login
- **Check**: Is voting active? (timer should be running)
- **Check**: Has election been started from admin dashboard?

### Timer not counting down
- **Refresh**: Browser page
- **Check**: Browser console for errors
- **Verify**: Election is marked as active in database

### Votes not recording
- **Check**: Vote count function exists (run step 3 above)
- **Check**: Database indexes exist (run step 2 above)
- **Verify**: Student hasn't already voted

## Emergency Contacts
- Database: Supabase Dashboard
- Logs: Browser Console (F12) and Terminal
- Backup: Export results before any major changes

## Success Indicators
✅ Timer counts down smoothly
✅ Students can login and vote
✅ Vote counts update in real-time
✅ System auto-stops at timer end
✅ Results generate correctly

---
**IMPORTANT**: Run all SQL scripts BEFORE the election starts!
