import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseTimestampMs } from '@/lib/time'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const voterId = cookieStore.get('voter_session')?.value
    const schoolId = cookieStore.get('voter_school_id')?.value

    if (!voterId || !schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = await createClient()

    // Check if election is active with time validation
    const { data: electionStatus } = await supabase
      .from('election_stats')
      .select('id, is_active, ended_at')
      .eq('is_active', true)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!electionStatus) {
      return NextResponse.json({ error: 'Voting is not currently active' }, { status: 403 })
    }

    // Validate time hasn't expired
    const now = Date.now()
    const endTime = parseTimestampMs(electionStatus.ended_at)

    if (now >= endTime) {
      // Auto-deactivate expired election
      await supabase
        .from('election_stats')
        .update({ is_active: false })
        .eq('id', electionStatus.id)
        .eq('school_id', schoolId)
      
      return NextResponse.json({ error: 'Voting period has ended' }, { status: 403 })
    }

    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('id, name, description, created_at')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (posError) throw posError

    const ballot = await Promise.all(
      positions.map(async (position) => {
        const { data: candidates } = await supabase
          .from('candidates')
          .select('id, name, student_id, manifesto, photo_url')
          .eq('position_id', position.id)
          .eq('school_id', schoolId)
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
