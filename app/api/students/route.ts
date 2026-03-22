import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateAdminSession } from '@/lib/admin-session'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSession = await validateAdminSession()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const schoolSlug = searchParams.get('school')
    const requestedLimit = parseInt(searchParams.get('limit') || '100')
    const limit = Math.min(Math.max(requestedLimit, 1), 500)
    let schoolId = adminSession?.schoolId || null

    if (!schoolId && schoolSlug) {
      const { data: school } = await supabase
        .from('schools')
        .select('id')
        .eq('slug', schoolSlug)
        .single()
      schoolId = school?.id || null
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'school query param required for public student listing' }, { status: 400 })
    }

    let query = supabase
      .from('students')
      .select(
        adminSession
          ? 'id, student_id, name, email, phone, class, pin, has_voted, voted_at, created_at'
          : 'id, student_id, name, class, has_voted'
      )
      .eq('school_id', schoolId)
      .order('name', { ascending: true })
      .limit(limit)

    if (search) {
      query = query.or(`name.ilike.%${search}%,student_id.ilike.%${search}%`)
    }

    const { data: students, error } = await query

    if (error) throw error

    return NextResponse.json(students)
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
