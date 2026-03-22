import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { normalizeSchoolSlug } from '@/lib/school'
import { parseTimestampMs } from '@/lib/time'

export async function POST(request: NextRequest) {
  try {
    const { student_id, pin, school_slug } = await request.json()

    if (!student_id || !pin || !school_slug) {
      return NextResponse.json({ error: 'School, student ID and PIN are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const normalizedSlug = normalizeSchoolSlug(school_slug)

    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, slug, portal_live')
      .eq('slug', normalizedSlug)
      .single()

    if (schoolError || !school) {
      return NextResponse.json({ error: 'Invalid school portal' }, { status: 404 })
    }

    if (!school.portal_live) {
      return NextResponse.json({ error: 'Election portal is not yet deployed for this school' }, { status: 403 })
    }

    // Check if voting is active
    const { data: election, error: electionError } = await supabase
      .from('election_stats')
      .select('is_active, ended_at')
      .eq('school_id', school.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (electionError && electionError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'System error. Please try again.' }, { status: 500 })
    }

    // Check if voting has started
    if (!election) {
      return NextResponse.json({ error: 'Voting has not yet begun. Please wait for the voting period to start.' }, { status: 403 })
    }

    // Check if voting is active and not expired
    const now = Date.now()
    const endTime = parseTimestampMs(election.ended_at)
    const hasExpired = endTime > 0 && now >= endTime

    if (!election.is_active || hasExpired) {
      return NextResponse.json({ error: 'The voting period has ended. Thank you for your interest.' }, { status: 403 })
    }

    const { data: student, error } = await supabase
      .from('students')
      .select('id, has_voted')
      .eq('id', student_id)
      .eq('school_id', school.id)
      .eq('pin', pin)
      .single()

    if (error || !student) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    if (student.has_voted) {
      return NextResponse.json({ error: 'You have already voted' }, { status: 403 })
    }

    const cookieStore = await cookies()
    cookieStore.set('voter_session', student.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    })

    cookieStore.set('voter_school_id', school.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    })

    cookieStore.set('voter_school_slug', school.slug, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    })

    return NextResponse.json({ success: true, student })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
