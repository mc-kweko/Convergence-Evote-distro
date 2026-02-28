import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const positionId = searchParams.get('position_id')

    let query = supabase
      .from('candidates')
      .select('*, position:positions(id, name)')
      .order('vote_count', { ascending: false })

    if (positionId) {
      query = query.eq('position_id', positionId)
    }

    const { data: candidates, error } = await query

    if (error) throw error

    return NextResponse.json(candidates || [])
  } catch (error) {
    console.error('Error fetching results:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
