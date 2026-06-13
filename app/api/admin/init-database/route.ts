import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// This endpoint initializes the database schema
// Should only be called once during setup

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Endpoint disabled in production' }, { status: 403 });
    }

    const initToken = process.env.INIT_DB_TOKEN;
    if (!initToken) {
      return NextResponse.json({ error: 'Server not configured for db init endpoint' }, { status: 500 });
    }

    // Verify this is called with proper auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const providedToken = authHeader.slice('Bearer '.length).trim();
    if (providedToken !== initToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if tables already exist
    const { data: tables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(1);

    if (!checkError && tables && tables.length > 0) {
      return NextResponse.json(
        { message: 'Database schema already initialized' },
        { status: 200 }
      );
    }

    // Create users table
    const { error: usersError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'chairperson_electoral_commission' NOT NULL,
          session_timeout_minutes INTEGER DEFAULT 15,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
    }); // Ignore if already exists

    // Create students table
    const { error: studentsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS students (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          school_id UUID NOT NULL,
          student_id VARCHAR(50) NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(20),
          class VARCHAR(100),
          pin VARCHAR(50),
          pin_generated_at TIMESTAMP,
          has_voted BOOLEAN DEFAULT FALSE,
          voted_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT students_student_id_school_unique UNIQUE (school_id, student_id)
        );
      `,
    });

    // Create positions table
    const { error: positionsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS positions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          max_votes INTEGER DEFAULT 1,
          is_active BOOLEAN DEFAULT TRUE,
          election_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_TIMESTAMP),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
    });

    // Create candidates table
    const { error: candidatesError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS candidates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
      `,
    });

    // Create votes table
    const { error: votesError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS votes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          school_id UUID NOT NULL,
          student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
          position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
          encrypted_vote_data TEXT,
          vote_hash VARCHAR(255) UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
    });

    // Create audit_logs table
    const { error: auditError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          resource_type VARCHAR(100),
          resource_id UUID,
          details JSONB,
          ip_address INET,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
    });

    // Create results table
    const { error: resultsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
          position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
          vote_count INTEGER DEFAULT 0,
          percentage NUMERIC(5, 2) DEFAULT 0,
          rank INTEGER,
          is_final BOOLEAN DEFAULT FALSE,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
    });

    // Create sessions table
    const { error: sessionsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) UNIQUE NOT NULL,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
    });

    // Create ballots table
    const { error: ballotsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ballots (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          ballot_code VARCHAR(100) UNIQUE,
          qr_code TEXT,
          is_used BOOLEAN DEFAULT FALSE,
          used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
    });

    // Create election_stats table
    const { error: statsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS election_stats (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          school_id UUID NOT NULL,
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
      `,
    });

    // Create voter_receipts table (used by Omicron atomic voting RPC)
    const { error: receiptsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS voter_receipts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          vote_hash TEXT UNIQUE NOT NULL,
          school_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `,
    });

    return NextResponse.json({
      message: 'Database initialization completed',
      status: 'success',
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}


