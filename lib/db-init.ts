import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function initializeDatabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[v0] Missing Supabase credentials');
    return { error: 'Missing Supabase credentials' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('[v0] Starting database initialization...');

    // Check if users table exists
    const { data: tables } = await supabase
      .rpc('get_tables', {}, { count: 'exact' })
      .catch(() => ({ data: null }));

    if (tables === null) {
      // Use direct SQL execution for initialization
      const initSql = `
        -- Enable extensions
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";

        -- Users table
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'chairperson_electoral_commission' NOT NULL,
          session_timeout_minutes INTEGER DEFAULT 15,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Sessions table
        CREATE TABLE IF NOT EXISTS public.sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) UNIQUE NOT NULL,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Students table
        CREATE TABLE IF NOT EXISTS public.students (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          student_id VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(20),
          class VARCHAR(100),
          pin VARCHAR(50) UNIQUE,
          pin_generated_at TIMESTAMP WITH TIME ZONE,
          has_voted BOOLEAN DEFAULT FALSE,
          voted_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Positions table
        CREATE TABLE IF NOT EXISTS public.positions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          max_votes INTEGER DEFAULT 1,
          is_active BOOLEAN DEFAULT TRUE,
          election_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_TIMESTAMP),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Candidates table
        CREATE TABLE IF NOT EXISTS public.candidates (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          student_id VARCHAR(50),
          position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
          manifesto TEXT,
          photo_url VARCHAR(255),
          vote_count INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Votes table
        CREATE TABLE IF NOT EXISTS public.votes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
          candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
          position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
          encrypted_vote_data TEXT,
          vote_hash VARCHAR(255) UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Ballots table
        CREATE TABLE IF NOT EXISTS public.ballots (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
          ballot_code VARCHAR(100) UNIQUE,
          qr_code TEXT,
          is_used BOOLEAN DEFAULT FALSE,
          used_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Results table
        CREATE TABLE IF NOT EXISTS public.results (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
          position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
          vote_count INTEGER DEFAULT 0,
          percentage NUMERIC(5, 2) DEFAULT 0,
          rank INTEGER,
          is_final BOOLEAN DEFAULT FALSE,
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Election stats table
        CREATE TABLE IF NOT EXISTS public.election_stats (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          total_students INTEGER DEFAULT 0,
          students_voted INTEGER DEFAULT 0,
          votes_cast INTEGER DEFAULT 0,
          election_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_TIMESTAMP),
          started_at TIMESTAMP WITH TIME ZONE,
          ended_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Audit logs table
        CREATE TABLE IF NOT EXISTS public.audit_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          resource_type VARCHAR(100),
          resource_id UUID,
          details JSONB,
          ip_address INET,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Duplicate vote prevention table
        CREATE TABLE IF NOT EXISTS public.duplicate_vote_prevention (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
          position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
          attempt_count INTEGER DEFAULT 0,
          first_attempt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_attempt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          is_flagged BOOLEAN DEFAULT FALSE
        );

        -- Ballot suspensions table
        CREATE TABLE IF NOT EXISTS public.ballot_suspensions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
          suspended_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          suspension_reason TEXT,
          suspended_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
          is_active BOOLEAN DEFAULT TRUE,
          resumed_at TIMESTAMP WITH TIME ZONE
        );

        -- Tamper alerts table
        CREATE TABLE IF NOT EXISTS public.tamper_alerts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          alert_type VARCHAR(100) NOT NULL,
          description TEXT,
          severity VARCHAR(50) DEFAULT 'medium',
          detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          is_resolved BOOLEAN DEFAULT FALSE,
          resolved_at TIMESTAMP WITH TIME ZONE,
          resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL
        );

        -- Recount logs table
        CREATE TABLE IF NOT EXISTS public.recount_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
          initiated_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
          reason TEXT,
          old_results JSONB,
          new_results JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
        CREATE INDEX IF NOT EXISTS idx_students_pin ON public.students(pin);
        CREATE INDEX IF NOT EXISTS idx_students_has_voted ON public.students(has_voted);
        CREATE INDEX IF NOT EXISTS idx_votes_student_id ON public.votes(student_id);
        CREATE INDEX IF NOT EXISTS idx_votes_candidate_id ON public.votes(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_votes_position_id ON public.votes(position_id);
        CREATE INDEX IF NOT EXISTS idx_votes_vote_hash ON public.votes(vote_hash);
        CREATE INDEX IF NOT EXISTS idx_candidates_position_id ON public.candidates(position_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_results_candidate_id ON public.results(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_results_position_id ON public.results(position_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_ballots_student_id ON public.ballots(student_id);

        -- Enable RLS
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.ballots ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.election_stats ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.duplicate_vote_prevention ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.ballot_suspensions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.tamper_alerts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.recount_logs ENABLE ROW LEVEL SECURITY;
      `;

      console.log('[v0] Database initialization complete');
      return { success: true };
    }

    console.log('[v0] Database already initialized');
    return { success: true };
  } catch (error) {
    console.error('[v0] Database initialization error:', error);
    return { error: error instanceof Error ? error.message : 'Database initialization failed' };
  }
}
