import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const voterId = cookieStore.get('voter_session')?.value

    if (!voterId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { votes } = await request.json()

    if (!votes || Object.keys(votes).length === 0) {
      return NextResponse.json({ error: 'No votes provided' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', voterId)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (student.has_voted) {
      return NextResponse.json({ error: 'Already voted' }, { status: 403 })
    }

    const voteRecords = Object.entries(votes).map(([positionId, candidateId]) => ({
      student_id: voterId,
      position_id: positionId,
      candidate_id: candidateId,
    }))

    const { error: voteError } = await supabase.from('votes').insert(voteRecords)

    if (voteError) throw voteError

    for (const candidateId of Object.values(votes)) {
      const { data: candidate } = await supabase
        .from('candidates')
        .select('vote_count')
        .eq('id', candidateId)
        .single()

      if (candidate) {
        await supabase
          .from('candidates')
          .update({ vote_count: (candidate.vote_count || 0) + 1 })
          .eq('id', candidateId)
      }
    }

    await supabase
      .from('students')
      .update({ has_voted: true, voted_at: new Date().toISOString() })
      .eq('id', voterId)

    cookieStore.delete('voter_session')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Vote submission error:', error)
    return NextResponse.json({ error: 'Failed to submit votes' }, { status: 500 })
  }
}
