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

    const { data: student, error } = await supabase
      .from('students')
      .select('*')
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
