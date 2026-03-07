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

    // Check if election is still active with time validation
    const { data: electionStatus } = await supabase
      .from('election_stats')
      .select('id, is_active, ended_at, students_voted, votes_cast')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!electionStatus) {
      return NextResponse.json({ error: 'Voting is not currently active' }, { status: 403 })
    }

    // Validate time hasn't expired
    const now = Date.now()
    const endTime = new Date(electionStatus.ended_at).getTime()

    if (now >= endTime) {
      // Auto-deactivate expired election
      await supabase
        .from('election_stats')
        .update({ is_active: false })
        .eq('id', electionStatus.id)
      
      return NextResponse.json({ error: 'Voting period has ended' }, { status: 403 })
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, has_voted')
      .eq('id', voterId)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (student.has_voted) {
      return NextResponse.json({ error: 'Already voted' }, { status: 403 })
    }

    // Check for existing votes (duplicate prevention)
    const { data: existingVotes } = await supabase
      .from('votes')
      .select('id')
      .eq('student_id', voterId)
      .limit(1)

    if (existingVotes && existingVotes.length > 0) {
      return NextResponse.json({ error: 'Duplicate vote detected' }, { status: 403 })
    }

    const voteRecords = Object.entries(votes).map(([positionId, candidateId]) => ({
      student_id: voterId,
      position_id: positionId,
      candidate_id: candidateId,
    }))

    // Insert votes and update counts in parallel
    const [voteResult, ...candidateUpdates] = await Promise.all([
      supabase.from('votes').insert(voteRecords),
      ...Object.values(votes).map((candidateId) =>
        supabase.rpc('increment_vote_count', { candidate_id: candidateId })
      )
    ])

    if (voteResult.error) {
      console.error('Vote insertion error:', voteResult.error)
      return NextResponse.json({ error: 'Failed to record votes' }, { status: 500 })
    }

    // Update student and election stats in parallel
    await Promise.all([
      supabase
        .from('students')
        .update({ has_voted: true, voted_at: new Date().toISOString() })
        .eq('id', voterId),
      supabase
        .from('election_stats')
        .update({ 
          students_voted: electionStatus.students_voted + 1,
          votes_cast: electionStatus.votes_cast + Object.keys(votes).length
        })
        .eq('id', electionStatus.id)
    ])

    cookieStore.delete('voter_session')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Vote submission error:', error)
    return NextResponse.json({ error: 'Failed to submit votes' }, { status: 500 })
  }
}
