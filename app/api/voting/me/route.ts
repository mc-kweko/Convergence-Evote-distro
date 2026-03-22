import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const voterId = cookieStore.get('voter_session')?.value
    const schoolId = cookieStore.get('voter_school_id')?.value

    if (!voterId || !schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', voterId)
      .eq('school_id', schoolId)
      .single()

    if (error || !student) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    return NextResponse.json({ student })
  } catch (error) {
    return NextResponse.json({ error: 'Session check failed' }, { status: 500 })
  }
}
