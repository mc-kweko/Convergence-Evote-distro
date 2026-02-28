-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_vote_prevention ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballot_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tamper_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recount_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS POLICIES (Admin only access)
-- ============================================
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin can read all user data"
  ON users FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "Users can update own password"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- SESSIONS POLICIES
-- ============================================
CREATE POLICY "Users can read own sessions"
  ON sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- STUDENTS POLICIES
-- ============================================
CREATE POLICY "Admin can read all students"
  ON students FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "Admin can create students"
  ON students FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "Admin can update students"
  ON students FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

-- ============================================
-- POSITIONS POLICIES
-- ============================================
CREATE POLICY "Anyone can read active positions"
  ON positions FOR SELECT
  USING (is_active = TRUE OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "Admin can manage positions"
  ON positions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "Admin can update positions"
  ON positions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

-- ============================================
-- CANDIDATES POLICIES
-- ============================================
CREATE POLICY "Anyone can read active candidates"
  ON candidates FOR SELECT
  USING (is_active = TRUE OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "Admin can manage candidates"
  ON candidates FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "Admin can update candidates"
  ON candidates FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

-- ============================================
-- VOTES POLICIES
-- ============================================
CREATE POLICY "Admin can read all votes"
  ON votes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "Only authenticated users can cast votes"
  ON votes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid()
  ));

-- ============================================
-- BALLOTS POLICIES
-- ============================================
CREATE POLICY "Admin can read all ballots"
  ON ballots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "Admin can create ballots"
  ON ballots FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "Admin can update ballots"
  ON ballots FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

-- ============================================
-- RESULTS POLICIES
-- ============================================
CREATE POLICY "Anyone can read results"
  ON results FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can manage results"
  ON results FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "Admin can update results"
  ON results FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

-- ============================================
-- ELECTION STATS POLICIES
-- ============================================
CREATE POLICY "Anyone can read election stats"
  ON election_stats FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can manage election stats"
  ON election_stats FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================
CREATE POLICY "Admin can read audit logs"
  ON audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "Anyone can create audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- ============================================
-- DUPLICATE VOTE PREVENTION POLICIES
-- ============================================
CREATE POLICY "Admin can read duplicate attempts"
  ON duplicate_vote_prevention FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "System can create/update records"
  ON duplicate_vote_prevention FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "System can update prevention records"
  ON duplicate_vote_prevention FOR UPDATE
  USING (TRUE);

-- ============================================
-- BALLOT SUSPENSION POLICIES
-- ============================================
CREATE POLICY "Admin can read suspensions"
  ON ballot_suspensions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "Admin can manage suspensions"
  ON ballot_suspensions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

-- ============================================
-- TAMPER ALERT POLICIES
-- ============================================
CREATE POLICY "Admin can read tamper alerts"
  ON tamper_alerts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "System can create alerts"
  ON tamper_alerts FOR INSERT
  WITH CHECK (TRUE);

-- ============================================
-- RECOUNT LOG POLICIES
-- ============================================
CREATE POLICY "Admin can read recount logs"
  ON recount_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));

CREATE POLICY "Admin can create recount logs"
  ON recount_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'chairperson_electoral_commission'
  ));
