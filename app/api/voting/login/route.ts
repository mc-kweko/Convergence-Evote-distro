import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { normalizeSchoolSlug } from '@/lib/school'
import { parseTimestampMs } from '@/lib/time'
import { checkPinRateLimit, resetPinRateLimit } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const LoginSchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
  pin: z.string().min(6).max(12).regex(/^\d+$/, 'PIN must be numeric'),
  school_slug: z.string().min(1).max(120),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'

  try {
    const body = await request.json()
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }
    const { student_id, pin, school_slug } = parsed.data

    const supabase = await createClient()
    const normalizedSlug = normalizeSchoolSlug(school_slug)

    // Validate school
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, slug, portal_live')
      .eq('slug', normalizedSlug)
      .single()

    if (schoolError || !school) {
      return NextResponse.json({ error: 'Invalid school portal' }, { status: 404 })
    }
    if (!school.portal_live) {
      return NextResponse.json({ error: 'Election portal is not yet active for this school' }, { status: 403 })
    }

    // Check rate limit BEFORE doing any DB lookups
    const rateCheck = await checkPinRateLimit(ip, student_id, school.id)
    if (!rateCheck.allowed) {
      // Log tamper alert
      await supabase.from('tamper_alerts').insert({
        alert_type: 'RATE_LIMIT_EXCEEDED',
        description: `PIN brute-force detected. IP: ${ip}, student: ${student_id}`,
        severity: 'high',
        school_id: school.id,
      })

      return NextResponse.json(

        { error: rateCheck.reason || 'Too many attempts. Please wait.' },
        { status: 429 }
      )
    }

    // Check election is active
    const { data: election } = await supabase
      .from('election_stats')
      .select('is_active, ended_at')
      .eq('school_id', school.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!election) {
      return NextResponse.json({ error: 'Voting has not started yet.' }, { status: 403 })
    }
    const now = Date.now()
    const endTime = parseTimestampMs(election.ended_at)
    if (!election.is_active || (endTime > 0 && now >= endTime)) {
      return NextResponse.json({ error: 'The voting period has ended.' }, { status: 403 })
    }

    // Fetch student — only what we need
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, has_voted, pin, pin_hash')
      .eq('id', student_id)
      .eq('school_id', school.id)
      .single()

    if (studentError || !student) {
      // Don't reveal whether student exists — always increment rate limit
      return NextResponse.json({ error: 'Invalid PIN. Please try again.' }, { status: 401 })
    }

    // Verify PIN — prefer bcrypt hash, fall back to plaintext for backward compat
    let pinValid = false
    if (student.pin_hash) {
      pinValid = await bcrypt.compare(pin, student.pin_hash)
    } else if (student.pin) {
      // Legacy plaintext comparison + opportunistic hash upgrade
      pinValid = pin === student.pin
      if (pinValid) {
        const newHash = await bcrypt.hash(pin, 10)
        await supabase
          .from('students')
          .update({ pin_hash: newHash })
          .eq('id', student.id)

      }
    }

    if (!pinValid) {
      // Log failed attempt
      await supabase.from('audit_logs').insert({
        action: 'VOTER_PIN_FAIL',
        school_id: school.id,
        ip_address: ip,
        details: { student_id, remaining: rateCheck.remainingAttempts },
      })

      return NextResponse.json(
        {
          error: 'Invalid PIN. Please try again.',
          remainingAttempts: (rateCheck.remainingAttempts ?? 5) - 1,
        },
        { status: 401 }
      )
    }

    if (student.has_voted) {
      return NextResponse.json({ error: 'You have already voted.' }, { status: 403 })
    }

    // Success — reset rate limit
    await resetPinRateLimit(ip, student_id)

    // Set voter session cookies (45 min)
    const cookieStore = await cookies()
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 45 * 60,
      path: '/',
    }
    cookieStore.set('voter_session', student.id, cookieOpts)
    cookieStore.set('voter_school_id', school.id, cookieOpts)
    cookieStore.set('voter_school_slug', school.slug, cookieOpts)

    // Audit log success
    await supabase.from('audit_logs').insert({
      action: 'VOTER_LOGIN',
      school_id: school.id,
      ip_address: ip,
      details: { student_id },
    })


    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[omicron] Voter login error:', error)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
