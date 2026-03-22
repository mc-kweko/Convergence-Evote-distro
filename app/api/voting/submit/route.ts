import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseTimestampMs } from '@/lib/time'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const voterId = cookieStore.get('voter_session')?.value
    const schoolId = cookieStore.get('voter_school_id')?.value

    if (!voterId || !schoolId) {
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

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, has_voted')
      .eq('id', voterId)
      .eq('school_id', schoolId)
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
      .eq('school_id', schoolId)
      .limit(1)

    if (existingVotes && existingVotes.length > 0) {
      return NextResponse.json({ error: 'Duplicate vote detected' }, { status: 403 })
    }

    const voteRecords = Object.entries(votes).map(([positionId, candidateId]) => ({
      student_id: voterId,
      position_id: positionId,
      candidate_id: candidateId,
      school_id: schoolId,
    }))

    const voteResult = await supabase.from('votes').insert(voteRecords)

    // Apply deterministic increments after insert succeeds
    if (!voteResult.error) {
      await Promise.all(
        Object.values(votes).map(async (candidateId) => {
          const { data: candidate } = await supabase
            .from('candidates')
            .select('vote_count')
            .eq('id', candidateId as string)
            .eq('school_id', schoolId)
            .single()

          await supabase
            .from('candidates')
            .update({ vote_count: (candidate?.vote_count || 0) + 1 })
            .eq('id', candidateId as string)
            .eq('school_id', schoolId)
        })
      )
    }

    if (voteResult.error) {
      console.error('Vote insertion error:', voteResult.error)
      return NextResponse.json({ error: 'Failed to record votes' }, { status: 500 })
    }

    // Update student and election stats in parallel
    await Promise.all([
      supabase
        .from('students')
        .update({ has_voted: true, voted_at: new Date().toISOString() })
        .eq('id', voterId)
        .eq('school_id', schoolId),

      supabase
        .from('election_stats')
        .update({ 
          students_voted: electionStatus.students_voted + 1,
          votes_cast: electionStatus.votes_cast + Object.keys(votes).length
        })
        .eq('id', electionStatus.id)
        .eq('school_id', schoolId)
    ])

    cookieStore.delete('voter_session')
    cookieStore.delete('voter_school_id')
    cookieStore.delete('voter_school_slug')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Vote submission error:', error)
    return NextResponse.json({ error: 'Failed to submit votes' }, { status: 500 })
  }
}
