import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const positionId = searchParams.get('position_id')
    const schoolId = searchParams.get('school_id')

    if (!schoolId) {
      return NextResponse.json({ error: 'school_id query param required' }, { status: 400 })
    }

    let query = supabase
      .from('candidates')
      .select(`
        id,
        name,
        vote_count,
        position:positions(
          id,
          name
        )
      `)
      .eq('school_id', schoolId)
      .order('vote_count', { ascending: false })

    if (positionId) {
      query = query.eq('position_id', positionId)
    }

    const { data: candidates, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    return NextResponse.json(candidates || [])
  } catch (error) {
    console.error('Error fetching results:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}
