import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { student_id, pin } = await request.json()

    if (!student_id || !pin) {
      return NextResponse.json({ error: 'Student ID and PIN required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if voting is active
    const { data: election, error: electionError } = await supabase
      .from('election_stats')
      .select('is_active, ended_at')
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
    const endTime = election.ended_at ? new Date(election.ended_at).getTime() : 0
    const hasExpired = endTime > 0 && now >= endTime

    if (!election.is_active || hasExpired) {
      return NextResponse.json({ error: 'The voting period has ended. Thank you for your interest.' }, { status: 403 })
    }

    const { data: student, error } = await supabase
      .from('students')
      .select('id, has_voted')
      .eq('id', student_id)
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

    return NextResponse.json({ success: true, student })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
