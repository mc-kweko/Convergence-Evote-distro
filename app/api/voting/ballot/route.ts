import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const voterId = cookieStore.get('voter_session')?.value

    if (!voterId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (posError) throw posError

    const ballot = await Promise.all(
      positions.map(async (position) => {
        const { data: candidates } = await supabase
          .from('candidates')
          .select('*')
          .eq('position_id', position.id)
          .eq('is_active', true)

        return {
          ...position,
          candidates: candidates || [],
        }
      })
    )

    return NextResponse.json(ballot)
  } catch (error) {
    console.error('Ballot fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch ballot' }, { status: 500 })
  }
}
