import { createClient } from '@/lib/supabase/server'

const MAX_ATTEMPTS_PER_IP = 5
const MAX_ATTEMPTS_PER_STUDENT = 5
const WINDOW_MINUTES = 10
const LOCKOUT_MINUTES = 15

export interface RateLimitResult {
  allowed: boolean
  remainingAttempts?: number
  lockedUntil?: Date
  reason?: string
}

/**
 * Check and increment rate limit for a PIN attempt.
 * Tracks both per-IP and per-student_id counters.
 */
export async function checkPinRateLimit(
  ip: string,
  studentId: string,
  schoolId: string
): Promise<RateLimitResult> {
  const supabase = await createClient()
  const now = new Date()
  const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000)

  // Check IP lock
  const ipResult = await checkAndIncrement(supabase, `ip:${ip}`, 'ip', schoolId, windowStart, now, MAX_ATTEMPTS_PER_IP)
  if (!ipResult.allowed) return ipResult

  // Check student lock
  const studentResult = await checkAndIncrement(supabase, `student:${studentId}`, 'student', schoolId, windowStart, now, MAX_ATTEMPTS_PER_STUDENT)
  if (!studentResult.allowed) return studentResult

  return { allowed: true, remainingAttempts: Math.min(ipResult.remainingAttempts!, studentResult.remainingAttempts!) }
}

/**
 * Reset rate limit counters after a successful login.
 */
export async function resetPinRateLimit(ip: string, studentId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('pin_rate_limits')
    .delete()
    .in('identifier', [`ip:${ip}`, `student:${studentId}`])
}

async function checkAndIncrement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  identifier: string,
  attemptType: string,
  schoolId: string,
  windowStart: Date,
  now: Date,
  maxAttempts: number
): Promise<RateLimitResult> {
  // Fetch existing record
  const { data: existing } = await supabase
    .from('pin_rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .order('window_start', { ascending: false })
    .limit(1)
    .single()

  // Check if currently locked
  if (existing?.locked_until && new Date(existing.locked_until) > now) {
    return {
      allowed: false,
      lockedUntil: new Date(existing.locked_until),
      reason: 'Too many failed attempts. Please wait before trying again.',
    }
  }

  // If record is stale (outside window), reset it
  if (!existing || new Date(existing.window_start) < windowStart) {
    await supabase.from('pin_rate_limits').upsert(
      {
        identifier,
        attempt_type: attemptType,
        attempts: 1,
        window_start: now.toISOString(),
        locked_until: null,
        school_id: schoolId,
        updated_at: now.toISOString(),
      },
      { onConflict: 'identifier' }
    )
    return { allowed: true, remainingAttempts: maxAttempts - 1 }
  }

  const newAttempts = (existing.attempts || 0) + 1

  if (newAttempts >= maxAttempts) {
    const lockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000)
    await supabase
      .from('pin_rate_limits')
      .update({ attempts: newAttempts, locked_until: lockedUntil.toISOString(), updated_at: now.toISOString() })
      .eq('identifier', identifier)

    return {
      allowed: false,
      lockedUntil,
      reason: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
    }
  }

  await supabase
    .from('pin_rate_limits')
    .update({ attempts: newAttempts, updated_at: now.toISOString() })
    .eq('identifier', identifier)

  return { allowed: true, remainingAttempts: maxAttempts - newAttempts }
}
