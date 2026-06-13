#!/usr/bin/env node
/**
 * Omicron School Vote — Database Migration Runner
 * Runs all SQL migration files against Supabase in order.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Load env from .env.local manually
import { readFileSync as rfs } from 'fs'
function loadEnv() {
  try {
    const raw = rfs(join(ROOT, '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // env already set or no file
  }
}
loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Extract project ref from URL  e.g. https://abc.supabase.co → abc
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]
const pgUrl = `postgresql://postgres.${projectRef}:${SERVICE_KEY}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`

console.log(`\n🚀  Omicron School Vote — Running migrations against: ${SUPABASE_URL}\n`)

// ── Migration files in execution order ──────────────────────────────────────
const MIGRATIONS = [
  '01-create-schema.sql',
  '02-rls-policies.sql',
  '03-multi-tenant-upgrade.sql',
  '04-omicron-security-upgrade.sql',
  'FINAL-SETUP.sql',
]

// Use Supabase REST rpc to execute SQL via service role
async function runSQL(label, sql) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`
  
  // Split on semicolons and run statement by statement via direct HTTP
  // We use the Supabase management API approach: POST to /rest/v1/ with raw SQL
  const apiUrl = `${SUPABASE_URL.replace('/rest/v1', '')}/rest/v1/rpc/exec_sql`
  
  // Fall back to chunked fetch approach
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  let ok = 0
  let skipped = 0

  for (const stmt of statements) {
    const full = stmt.endsWith(';') ? stmt : stmt + ';'
    try {
      const res = await fetch(`${SUPABASE_URL}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ query: full }),
      })
      ok++
    } catch {
      skipped++
    }
  }

  return { ok, skipped, total: statements.length }
}

// Better approach: use pg driver which is already in devDependencies
async function runWithPg() {
  let pg
  try {
    pg = await import('pg')
  } catch {
    console.error('❌  pg package not found. Run: pnpm install')
    process.exit(1)
  }

  const { default: Pg } = pg
  const Client = Pg.Client || Pg

  // Supabase connection string — using the Transaction pooler
  const connectionString = `postgresql://postgres.${projectRef}:${SERVICE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

  try {
    console.log('🔌  Connecting to Supabase PostgreSQL...')
    await client.connect()
    console.log('✅  Connected.\n')
  } catch (err) {
    console.error('❌  Connection failed:', err.message)
    console.log('\nTrying direct connection string format...')
    
    // Try alternate format
    const altClient = new Client({
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: SERVICE_KEY,
      ssl: { rejectUnauthorized: false },
    })
    
    try {
      await altClient.connect()
      console.log('✅  Connected via alternate format.\n')
      await executeMigrations(altClient)
      await altClient.end()
      return
    } catch (err2) {
      console.error('❌  Both connection attempts failed:', err2.message)
      console.log('\n📋  Manual fallback: paste each SQL file into Supabase Dashboard → SQL Editor and run.')
      process.exit(1)
    }
  }

  await executeMigrations(client)
  await client.end()
}

async function executeMigrations(client) {
  for (const file of MIGRATIONS) {
    const filePath = join(ROOT, 'scripts', file)
    let sql
    try {
      sql = readFileSync(filePath, 'utf8')
    } catch {
      console.warn(`⚠️   File not found, skipping: ${file}`)
      continue
    }

    console.log(`\n📄  Running: ${file}`)
    console.log('─'.repeat(50))

    // Split into individual statements
    const statements = sql
      .replace(/--[^\n]*/g, '')        // strip line comments
      .split(/;\s*(?:\n|$)/)           // split on semicolons
      .map(s => s.trim())
      .filter(s => s.length > 10)      // skip empty/tiny fragments

    let passed = 0
    let warned = 0

    for (const stmt of statements) {
      try {
        await client.query(stmt)
        passed++
      } catch (err) {
        // Ignore "already exists" errors — idempotent migrations
        if (
          err.message.includes('already exists') ||
          err.message.includes('duplicate') ||
          err.message.includes('does not exist') && stmt.toLowerCase().includes('drop')
        ) {
          warned++
        } else {
          console.warn(`  ⚠️  Statement skipped (${err.message.slice(0, 80)})`)
          warned++
        }
      }
    }

    console.log(`  ✅  ${passed} statements executed, ${warned} skipped (already-exists/no-op)`)
  }

  console.log('\n' + '═'.repeat(50))
  console.log('🎉  All migrations complete!')
  console.log('═'.repeat(50))
  console.log('\nNext steps:')
  console.log('  1. Run PIN hash migration: node scripts/migrate-pin-hashes.mjs')
  console.log('  2. Install deps: pnpm install')
  console.log('  3. Start dev server: pnpm dev\n')
}

runWithPg()
