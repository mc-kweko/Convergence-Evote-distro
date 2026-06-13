#!/usr/bin/env node
/**
 * Omicron School Vote — PIN Hash Migration Script
 *
 * Reads all students with a plain-text `pin` but no `pin_hash`,
 * hashes each PIN with bcrypt (10 rounds), and writes it back.
 *
 * Run ONCE after deploying 04-omicron-security-upgrade.sql.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/migrate-pin-hashes.mjs
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function migrateHashes() {
  console.log('Fetching students with unhashed PINs...')

  const { data: students, error } = await supabase
    .from('students')
    .select('id, pin')
    .is('pin_hash', null)
    .not('pin', 'is', null)

  if (error) {
    console.error('Failed to fetch students:', error.message)
    process.exit(1)
  }

  console.log(`Found ${students.length} students to migrate.`)

  let success = 0
  let failed = 0

  for (const student of students) {
    try {
      const hash = await bcrypt.hash(student.pin, 10)
      const { error: updateError } = await supabase
        .from('students')
        .update({ pin_hash: hash })
        .eq('id', student.id)

      if (updateError) throw updateError
      success++
      process.stdout.write(`\r  Hashed ${success}/${students.length}...`)
    } catch (err) {
      failed++
      console.error(`\n  Failed for student ${student.id}:`, err.message)
    }
  }

  console.log(`\n\nMigration complete: ${success} hashed, ${failed} failed.`)
  if (failed > 0) {
    console.warn('Some PINs could not be migrated. Re-run this script to retry.')
    process.exit(1)
  }
}

migrateHashes()
