-- ============================================
-- OMICRON SCHOOL VOTE — Atomic vote submission RPC
-- ============================================
-- This function:
-- 1) Verifies election is active
-- 2) Locks the student row and ensures has_voted=false
-- 3) Validates candidate/position belong to school and are active
-- 4) Inserts immutable votes
-- 5) Increments vote counts via increment_vote_count (atomic inside SQL)
-- 6) Marks student.has_voted=true, sets voted_at
-- 7) Updates election_stats counters
-- 8) Stores voter_receipt with verifiable vote_hash
--
-- Note: vote_hash secret handling is done in application code (generateVoteHash()).

CREATE OR REPLACE FUNCTION submit_votes_atomic(
  p_school_id UUID,
  p_student_id UUID,
  p_votes JSONB,                 -- { position_id: candidate_id, ... }
  p_vote_hash TEXT,
  p_receipt_created_at TIMESTAMPTZ DEFAULT now(),
  p_ip_address TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, error_code TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_election RECORD;
  v_student RECORD;
  v_position_id UUID;
  v_candidate_id UUID;
  v_timestamp TIMESTAMPTZ;
  v_positions_count INT;
BEGIN
  v_timestamp := now();

  -- 1) Election must be active
  SELECT * INTO v_election
  FROM election_stats
  WHERE school_id = p_school_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_election.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'ELECTION_NOT_FOUND';
  END IF;

  IF COALESCE(v_election.is_active, false) = false THEN
    RETURN QUERY SELECT FALSE, 'ELECTION_INACTIVE';
  END IF;

  IF v_election.ended_at IS NOT NULL AND v_election.ended_at > '1970-01-01'::timestamptz AND now() >= v_election.ended_at THEN
    RETURN QUERY SELECT FALSE, 'ELECTION_ENDED';
  END IF;

  -- 2) Lock student row and ensure they haven't voted
  SELECT * INTO v_student
  FROM students
  WHERE school_id = p_school_id AND id = p_student_id
  FOR UPDATE;

  IF v_student.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'STUDENT_NOT_FOUND';
  END IF;

  IF COALESCE(v_student.has_voted, false) = true THEN
    RETURN QUERY SELECT FALSE, 'STUDENT_ALREADY_VOTED';
  END IF;

  -- 3) Validate votes JSON: must map position_id -> candidate_id
  v_positions_count := COALESCE(jsonb_object_length(p_votes), 0);
  IF v_positions_count <= 0 THEN
    RETURN QUERY SELECT FALSE, 'EMPTY_VOTES';
  END IF;

  -- Validate that every candidate_id exists for this school, candidate is active,
  -- and matches the position_id in the request.
  -- We'll also ensure all positions exist for the school and are active.
  IF (
    SELECT COUNT(*)
    FROM jsonb_each(p_votes) AS x(position_id_text, candidate_id_text)
    JOIN positions pos ON pos.id = (x.position_id_text)::uuid AND pos.school_id = p_school_id AND COALESCE(pos.is_active, true) = true
    JOIN candidates c ON c.id = (x.candidate_id_text)::uuid AND c.school_id = p_school_id AND c.position_id = pos.id AND COALESCE(c.is_active, true) = true
  ) != v_positions_count
  THEN
    RETURN QUERY SELECT FALSE, 'INVALID_SELECTION';
  END IF;

  -- 4) Insert votes (immutable)
  -- Insert only if not already present (defense-in-depth). Student row is locked already,
  -- but this also protects if duplicates arrive concurrently.
  INSERT INTO votes (student_id, position_id, candidate_id, school_id, vote_hash, created_at)
  SELECT
    p_student_id,
    (kv.key)::uuid,
    (kv.value)::uuid,
    p_school_id,
    p_vote_hash,
    v_timestamp
  FROM jsonb_each(p_votes) kv
  WHERE NOT EXISTS (
    SELECT 1
    FROM votes existing
    WHERE existing.school_id = p_school_id
      AND existing.student_id = p_student_id
  );

  -- 5) Increment vote counts for each distinct candidate
  -- (use distinct to avoid accidental double increment if bad JSON repeats IDs)
  FOR v_candidate_id IN
    SELECT DISTINCT (kv.value)::uuid
    FROM jsonb_each(p_votes) kv
  LOOP
    PERFORM increment_vote_count(v_candidate_id, p_school_id);
  END LOOP;

  -- 6) Mark student voted
  UPDATE students
  SET has_voted = true,
      voted_at = v_timestamp
  WHERE school_id = p_school_id AND id = p_student_id;

  -- 7) Update election stats
  UPDATE election_stats
  SET students_voted = COALESCE(students_voted, 0) + 1,
      votes_cast = COALESCE(votes_cast, 0) + v_positions_count,
      updated_at = now()
  WHERE school_id = p_school_id AND id = v_election.id;

  -- 8) Store voter receipt (vote_hash must be unique)
  INSERT INTO voter_receipts (vote_hash, school_id, created_at)
  VALUES (p_vote_hash, p_school_id, p_receipt_created_at)
  ON CONFLICT (vote_hash) DO NOTHING;

  -- 9) Audit log (best-effort)
  IF p_ip_address IS NOT NULL THEN
    INSERT INTO audit_logs (school_id, action, ip_address, details, created_at)
    VALUES (
      p_school_id,
      'VOTE_SUBMITTED',
      p_ip_address,
      jsonb_build_object('student_id', p_student_id, 'positions_voted', v_positions_count),
      now()
    );
  END IF;

  RETURN QUERY SELECT TRUE, NULL;
EXCEPTION
  WHEN unique_violation THEN
    -- Receipt hash or vote uniqueness conflict
    RETURN QUERY SELECT FALSE, 'CONFLICT_UNIQUE';
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'UNHANDLED_EXCEPTION';
END;
$$;

