-- ============================================
-- CONVERGENCE E-VOTE MULTI-TENANT UPGRADE
-- Supports 100+ schools on one shared database
-- ============================================

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  school_email VARCHAR(255) UNIQUE NOT NULL,
  portal_live BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add school_id to tenant data tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE ballots ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE results ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE election_stats ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;

-- Backfill existing single-tenant installs to a default workspace
INSERT INTO schools (name, slug, school_email)
SELECT 'Default School Workspace', 'default-school', 'admin@default.school'
WHERE NOT EXISTS (SELECT 1 FROM schools);

UPDATE users SET school_id = (SELECT id FROM schools ORDER BY created_at ASC LIMIT 1) WHERE school_id IS NULL;
UPDATE students SET school_id = (SELECT id FROM schools ORDER BY created_at ASC LIMIT 1) WHERE school_id IS NULL;
UPDATE positions SET school_id = (SELECT id FROM schools ORDER BY created_at ASC LIMIT 1) WHERE school_id IS NULL;
UPDATE candidates SET school_id = (SELECT id FROM schools ORDER BY created_at ASC LIMIT 1) WHERE school_id IS NULL;
UPDATE votes SET school_id = (SELECT id FROM schools ORDER BY created_at ASC LIMIT 1) WHERE school_id IS NULL;
UPDATE ballots SET school_id = (SELECT id FROM schools ORDER BY created_at ASC LIMIT 1) WHERE school_id IS NULL;
UPDATE results SET school_id = (SELECT id FROM schools ORDER BY created_at ASC LIMIT 1) WHERE school_id IS NULL;
UPDATE election_stats SET school_id = (SELECT id FROM schools ORDER BY created_at ASC LIMIT 1) WHERE school_id IS NULL;
UPDATE audit_logs SET school_id = (SELECT id FROM schools ORDER BY created_at ASC LIMIT 1) WHERE school_id IS NULL;

-- Remove single-tenant unique constraints so schools can reuse student IDs and position names independently
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_id_key;
ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_name_key;

-- Tighten uniqueness to school boundaries where needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_school_studentid_unique'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_school_studentid_unique UNIQUE (school_id, student_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'positions_school_name_unique'
  ) THEN
    ALTER TABLE positions ADD CONSTRAINT positions_school_name_unique UNIQUE (school_id, name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_positions_school_id ON positions(school_id);
CREATE INDEX IF NOT EXISTS idx_candidates_school_id ON candidates(school_id);
CREATE INDEX IF NOT EXISTS idx_votes_school_id ON votes(school_id);
CREATE INDEX IF NOT EXISTS idx_election_stats_school_id ON election_stats(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_id ON audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_schools_slug ON schools(slug);

-- School-safe vote increment function
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
