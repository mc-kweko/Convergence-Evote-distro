import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const positionId = searchParams.get('position_id')

    let query = supabase
      .from('candidates')
      .select('*, position:positions(*)')

    if (positionId) {
      query = query.eq('position_id', positionId)
    }

    const { data: candidates, error } = await query

    if (error) throw error

    return NextResponse.json(candidates)
  } catch (error) {
    console.error('Error fetching candidates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
      .insert([{ position_id, name, student_id, manifesto, photo_url }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(candidate)
  } catch (error) {
    console.error('Error creating candidate:', error)
    return NextResponse.json({ error: 'Failed to create candidate' }, { status: 500 })
  }
}
