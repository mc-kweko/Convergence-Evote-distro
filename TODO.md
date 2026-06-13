# TODO (Convergence E-Vote)

## Status
- [x] Run app (pnpm dev)
- [ ] Migrate database schema to Supabase (pnpm db:migrate)
- [ ] Run HEALTH-CHECK.sql in Supabase

## Next steps
1. Ensure env vars `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING` are available to `scripts/run-migrations.mjs`.
   - Prefer putting them into `Convergence-Evote-distro/.env.local`.
2. Run: `pnpm db:migrate`
3. In Supabase SQL editor, run: `scripts/HEALTH-CHECK.sql`

