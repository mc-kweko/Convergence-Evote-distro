import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateAdminSession } from '@/lib/admin-session'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSession = await validateAdminSession()
    const { searchParams } = new URL(request.url)
    const positionId = searchParams.get('position_id')
    const schoolId = searchParams.get('school_id')

    if (!adminSession && !schoolId) {
      return NextResponse.json({ error: 'school_id query param required' }, { status: 400 })
    }

    let query = supabase
      .from('candidates')
      .select('id, position_id, name, student_id, manifesto, photo_url, created_at')
      .eq('school_id', adminSession?.schoolId || schoolId)

    if (positionId) {
      query = query.eq('position_id', positionId)
    }

    if (!adminSession) {
      query = query.eq('is_active', true)
    }

    const { data: candidates, error } = await query

    if (error) {
      console.error('Database error fetching candidates:', error)
      throw error
    }

    return NextResponse.json(candidates)
  } catch (error) {
    console.error('Error fetching candidates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminSession = await validateAdminSession()
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()
    const { position_id, name, student_id, manifesto, photo_url } = body

    if (!position_id || !name) {
      return NextResponse.json(
        { error: 'Position ID and name are required' },
        { status: 400 }
      )
    }

    const { data: candidate, error } = await supabase
      .from('candidates')
      .insert([{ position_id, name, student_id, manifesto, photo_url, school_id: adminSession.schoolId }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(candidate)
  } catch (error) {
    console.error('Error creating candidate:', error)
    return NextResponse.json({ error: 'Failed to create candidate' }, { status: 500 })
  }
}
