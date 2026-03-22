# Convergence E-Vote - Database Setup Guide

This guide walks you through setting up the Supabase PostgreSQL database for the Electoral Commission Admin Dashboard.

## Prerequisites

- Supabase project already connected (environment variables are set)
- Node.js 18+ installed locally
- pnpm package manager

## Setup Methods

### Method 1: Using the Migration Script (Recommended)

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Run the migration:**
   ```bash
   pnpm db:migrate
   ```

This will automatically create all tables, indexes, and triggers in your Supabase PostgreSQL database.

### Method 2: Manual Setup via Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the contents of `scripts/01-create-schema.sql`
5. Run the query
6. Create another query with contents of `scripts/02-rls-policies.sql`
7. Run that query as well

### Method 3: Using psql CLI

If you have PostgreSQL installed locally:

```bash
psql $POSTGRES_URL_NON_POOLING < scripts/01-create-schema.sql
psql $POSTGRES_URL_NON_POOLING < scripts/02-rls-policies.sql
```

## Database Schema

The setup creates the following tables:

### Core Tables
- **users** - Admin users (chairperson/electoral commission members)
- **sessions** - User session management
- **students** - Eligible voters
- **positions** - Election positions (e.g., President, Vice President)
- **candidates** - Candidates for positions
- **votes** - Encrypted vote records

### Management Tables
- **ballots** - Ballot codes and QR codes
- **election_stats** - Overall election statistics
- **results** - Vote counts and rankings
- **audit_logs** - All system actions logged

### Security Tables
- **duplicate_vote_prevention** - Tracks vote attempts per student
- **ballot_suspensions** - Emergency ballot suspension records
- **tamper_alerts** - System tamper detection
- **recount_logs** - Manual recount history

## Features Enabled

✓ Row Level Security (RLS) - Data access control
✓ Automatic timestamps - created_at, updated_at
✓ Referential integrity - Foreign key constraints
✓ Vote encryption - AES-256-GCM encryption
✓ Audit logging - All actions tracked
✓ Session management - 15-minute timeout
✓ PIN generation - Automatic PIN for students

## Verification

After setup, verify everything is working:

1. Check the login page loads at `http://localhost:3000`
2. Verify Supabase shows all tables in the SQL Editor
3. Run a test query to confirm data access works

## Next Steps

1. Create an admin account by running the admin setup script (coming soon)
2. Import student data via the Students page
3. Create positions and candidates
4. Enable voting and monitor results

## Troubleshooting

### "Tables not found" error
- Verify migration ran without errors
- Check Supabase SQL Editor to confirm tables exist
- Ensure environment variables are set correctly

### "Connection refused" error
- Verify POSTGRES_URL environment variable is correct
- Check internet connection to Supabase
- Ensure Supabase project is not paused

### "Permission denied" error
- Verify you're using POSTGRES_URL_NON_POOLING or POSTGRES_URL
- Check that the database user has sufficient permissions
- Ensure RLS policies are properly applied

## Environment Variables Required

```
SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_ANON_KEY=<anon_key>
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
POSTGRES_URL=<connection_string>
POSTGRES_URL_NON_POOLING=<connection_string_no_pooling>
POSTGRES_USER=<postgres_user>
POSTGRES_PASSWORD=<postgres_password>
POSTGRES_DATABASE=postgres
POSTGRES_HOST=<postgres_host>
```

All these should be automatically configured when you connect Supabase integration.

## Support

If you encounter issues:
1. Check the debug logs in the browser console
2. Verify all environment variables are set
3. Ensure your Supabase project is active
4. Check PostgreSQL logs in Supabase dashboard

