import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { encryptVote, generateVoteId, hashPin } from '@/lib/security'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { student_id, voting_pin, candidate_id } = body

    if (!student_id || !voting_pin || !candidate_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify student exists and pin is correct
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', student_id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Invalid student' }, { status: 400 })
    }

    if (student.voting_pin !== voting_pin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    // Check if student already voted
    const { data: existingVote } = await supabase
      .from('votes')
      .select('*')
      .eq('student_id', student.id)
      .eq('status', 'completed')

    if (existingVote && existingVote.length > 0) {
      return NextResponse.json(
        { error: 'Student has already voted' },
        { status: 400 }
      )
    }

    // Generate encryption key from voting pin
    const encryptionKey = crypto
      .createHash('sha256')
      .update(voting_pin + 'salt123')
      .digest('hex')

    // Create vote record
    const voteId = generateVoteId()
    const encryptedData = encryptVote(
      JSON.stringify({ candidate_id, timestamp: new Date().toISOString() }),
      encryptionKey
    )

    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .insert([
        {
          student_id: student.id,
          candidate_id,
          vote_id: voteId,
          encrypted_data: encryptedData,
          status: 'completed',
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        },
      ])
      .select()
      .single()

    if (voteError) throw voteError

    // Log audit
    await supabase.from('audit_logs').insert({
      action: 'VOTE_CAST',
      details: `Vote recorded for student ${student_id}`,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
    })

    return NextResponse.json({
      message: 'Vote recorded successfully',
      vote_id: voteId,
    })
  } catch (error) {
    console.error('Error recording vote:', error)
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const candidateId = searchParams.get('candidate_id')

    let query = supabase
      .from('votes')
      .select('*')
      .eq('status', 'completed')

    if (candidateId) {
      query = query.eq('candidate_id', candidateId)
    }

    const { data: votes, error } = await query

    if (error) throw error

    return NextResponse.json({
      total: votes.length,
      votes,
    })
  } catch (error) {
    console.error('Error fetching votes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
