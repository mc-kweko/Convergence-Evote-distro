import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateAdminSession } from '@/lib/admin-session'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSession = await validateAdminSession()
    const schoolId = request.nextUrl.searchParams.get('school_id')

    if (!adminSession && !schoolId) {
      return NextResponse.json({ error: 'school_id query param required' }, { status: 400 })
    }

    let query = supabase
      .from('positions')
      .select('*')
      .eq('school_id', adminSession?.schoolId || schoolId)
      .order('created_at', { ascending: true })

    if (!adminSession) {
      query = query.eq('is_active', true)
    }

    const { data: positions, error } = await query

    if (error) throw error

    return NextResponse.json(positions)
  } catch (error) {
    console.error('Error fetching positions:', error)
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
    const { name, description, max_votes } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Check if position already exists
    const { data: existing } = await supabase
      .from('positions')
      .select('id')
      .eq('school_id', adminSession.schoolId)
      .eq('name', name)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'A position with this name already exists' }, { status: 400 })
    }

    const { data: position, error } = await supabase
      .from('positions')
      .insert([{ name, description, max_votes: max_votes || 1, school_id: adminSession.schoolId }])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A position with this name already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 })
    }

    return NextResponse.json(position)
  } catch (error) {
    console.error('Error creating position:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create position' 
    }, { status: 500 })
  }
}
