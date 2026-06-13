# Omicron School Vote — Voting Portal Guide

## Quick Start

### 1. Run database migrations (in order, in Supabase SQL Editor)
```
scripts/01-create-schema.sql          ← base schema
scripts/02-rls-policies.sql           ← row level security
scripts/03-multi-tenant-upgrade.sql   ← multi-tenancy
scripts/04-omicron-security-upgrade.sql  ← PIN hashing + rate limits + receipts
scripts/FINAL-SETUP.sql               ← indexes + increment_vote_count function
```

### 2. Copy and fill in environment variables
```bash
cp .env.example .env.local
# Fill in all values — especially VOTE_HASH_SECRET
```

Generate VOTE_HASH_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Hash existing PINs (run once after migration)
```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-pin-hashes.mjs
```

### 4. Install dependencies and run
```bash
pnpm install
pnpm dev       # development
pnpm build && pnpm start   # production
```

---

## Voter Flow

| URL | Purpose |
|-----|---------|
| `/voting` | Landing — school + student selection + PIN entry |
| `/vote` | Ballot page (requires voter_session cookie) |
| `/voting/success` | Confirmation + vote receipt |
| `/portal/[schoolSlug]` | Shortcut URL — redirects to `/voting?school=slug` |

---

## Admin Flow

| URL | Purpose |
|-----|---------|
| `/admin` | Admin login |
| `/admin/signup` | Register new school workspace |
| `/dashboard` | Main dashboard with election timer |
| `/dashboard/students` | Import students, generate voting cards |
| `/dashboard/ballot` | Create positions and candidates |
| `/dashboard/results` | Live results + export PDF |
| `/dashboard/settings` | Password change, system reset |

---

## Security Features Implemented

- **PIN hashing**: bcrypt (10 rounds). New students hashed on import. Existing students migrated via `migrate-pin-hashes.mjs`.
- **Rate limiting**: 5 attempts per IP + 5 per student per 10-minute window. 15-minute lockout. Stored in `pin_rate_limits` table.
- **Atomic vote counting**: Uses PostgreSQL `increment_vote_count(candidate_id, school_id)` function.
- **Vote hash**: SHA-256(studentId + candidateIds + timestamp + VOTE_HASH_SECRET). Stored in `voter_receipts`.
- **Session security**: voter cookies are `httpOnly`, `secure` (prod), `sameSite=lax`, 45-minute expiry.
- **Security headers**: CSP, X-Frame-Options, HSTS, X-Content-Type-Options via `middleware.ts`.
- **Route guards**: Middleware protects `/vote` (requires voter cookie) and `/dashboard` (requires admin cookie).
- **Audit logging**: Every login attempt, vote submission, and rate limit trigger is logged to `audit_logs`.

---

## Election Day Checklist

1. Import students via Dashboard → Students → Import Excel
2. Download and print voting cards (Dashboard → Students → Generate Voting Cards)
3. Set up positions and candidates (Dashboard → Ballot Setup)
4. Start election: Dashboard → Election Timer → Enter duration → Deploy Portal and Start Election
5. Share voting URL with students: `https://yourdomain.com/voting` or `/portal/school-slug`
6. Monitor live: Dashboard → Results
7. Export results PDF when done

---

## Notes

- `portal_live` is set to `true` when the election is started via "Deploy Portal and Start Election". It is NOT automatically reset to `false` when the election ends — reset manually in Settings if needed for the next election.
- The `pin` column (plaintext) is kept for printing voting cards. After printing, you may null it out for security.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is only used server-side in API routes.
