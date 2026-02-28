-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'chairperson_electoral_commission' NOT NULL,
  session_timeout_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  class VARCHAR(100),
  pin VARCHAR(50) UNIQUE,
  pin_generated_at TIMESTAMP,
  has_voted BOOLEAN DEFAULT FALSE,
  voted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ELECTION SETUP TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  max_votes INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  election_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_TIMESTAMP),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  student_id VARCHAR(50),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  manifesto TEXT,
  photo_url VARCHAR(255),
  vote_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- VOTING TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  encrypted_vote_data TEXT,
  vote_hash VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ballots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  ballot_code VARCHAR(100) UNIQUE,
  qr_code TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- RESULTS TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  vote_count INTEGER DEFAULT 0,
  percentage NUMERIC(5, 2) DEFAULT 0,
  rank INTEGER,
  is_final BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS election_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_students INTEGER DEFAULT 0,
  students_voted INTEGER DEFAULT 0,
  votes_cast INTEGER DEFAULT 0,
  election_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_TIMESTAMP),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AUDIT & SECURITY TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS duplicate_vote_prevention (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  attempt_count INTEGER DEFAULT 0,
  first_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_flagged BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS ballot_suspensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  suspended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  suspension_reason TEXT,
  suspended_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  resumed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tamper_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type VARCHAR(100) NOT NULL,
  description TEXT,
  severity VARCHAR(50) DEFAULT 'medium',
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS recount_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  old_results JSONB,
  new_results JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_pin ON students(pin);
CREATE INDEX idx_students_has_voted ON students(has_voted);
CREATE INDEX idx_votes_student_id ON votes(student_id);
CREATE INDEX idx_votes_candidate_id ON votes(candidate_id);
CREATE INDEX idx_votes_position_id ON votes(position_id);
CREATE INDEX idx_votes_vote_hash ON votes(vote_hash);
CREATE INDEX idx_candidates_position_id ON candidates(position_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_results_candidate_id ON results(candidate_id);
CREATE INDEX idx_results_position_id ON results(position_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_ballots_student_id ON ballots(student_id);

-- ============================================
-- UPDATE TIMESTAMPS TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_election_stats_updated_at BEFORE UPDATE ON election_stats FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
