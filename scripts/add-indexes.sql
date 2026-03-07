-- Performance optimization: Add indexes to frequently queried columns
-- Run this in Supabase SQL Editor

-- Index for election_stats queries
CREATE INDEX IF NOT EXISTS idx_election_stats_is_active ON election_stats(is_active);
CREATE INDEX IF NOT EXISTS idx_election_stats_created_at ON election_stats(created_at DESC);

-- Index for votes queries (duplicate check)
CREATE INDEX IF NOT EXISTS idx_votes_student_id ON votes(student_id);
CREATE INDEX IF NOT EXISTS idx_votes_position_id ON votes(position_id);

-- Index for positions queries
CREATE INDEX IF NOT EXISTS idx_positions_is_active ON positions(is_active);

-- Index for candidates queries
CREATE INDEX IF NOT EXISTS idx_candidates_position_id ON candidates(position_id);

-- Index for students queries
CREATE INDEX IF NOT EXISTS idx_students_pin ON students(pin);
CREATE INDEX IF NOT EXISTS idx_students_has_voted ON students(has_voted);
