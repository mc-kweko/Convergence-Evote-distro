-- Fix timestamp columns to use timestamptz (timestamp with timezone)
-- Run this in Supabase SQL Editor

ALTER TABLE election_stats 
  ALTER COLUMN started_at TYPE timestamptz USING started_at AT TIME ZONE 'UTC',
  ALTER COLUMN ended_at TYPE timestamptz USING ended_at AT TIME ZONE 'UTC';
