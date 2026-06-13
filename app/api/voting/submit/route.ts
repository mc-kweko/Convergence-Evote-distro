import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateVoteHash } from '@/lib/security'
import { z } from 'zod'

const SubmitSchema = z.object({
  votes: z.record(z.string().uuid(), z.string().uuid()),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'

  try {
    const cookieStore = await cookies()
    const voterId = cookieStore.get('voter_session')?.value
    const schoolId = cookieStore.get('voter_school_id')?.value

    if (!voterId || !schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = SubmitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid vote data' }, { status: 400 })
    }
    const { votes } = parsed.data

    if (Object.keys(votes).length === 0) {
      return NextResponse.json({ error: 'No votes provided' }, { status: 400 })
    }

    const supabase = await createClient()

    // Application-level receipt hash generation
    const timestamp = new Date().toISOString()
    const candidateIds = Object.values(votes)
    const voteHash = generateVoteHash(voterId, candidateIds, timestamp)

    const { data, error } = await supabase.rpc('submit_votes_atomic', {
      p_school_id: schoolId,
      p_student_id: voterId,
      p_votes: votes,
      p_vote_hash: voteHash,
      p_receipt_created_at: new Date(timestamp).toISOString(),
      p_ip_address: ip,
    })

    if (error) {
      console.error('[omicron] submit_votes_atomic rpc error:', error)
      return NextResponse.json({ error: 'Failed to submit votes. Please try again.' }, { status: 500 })
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row?.success) {
      const code = row?.error_code || 'SUBMIT_FAILED'
      // Map DB codes to user-safe messages
      if (code === 'STUDENT_ALREADY_VOTED') {
        return NextResponse.json({ error: 'You have already voted.' }, { status: 403 })
      }
      if (code === 'ELECTION_ENDED' || code === 'ELECTION_INACTIVE') {
        return NextResponse.json({ error: 'Voting is not currently active.' }, { status: 403 })
      }
      if (code === 'INVALID_SELECTION') {
        return NextResponse.json({ error: 'Invalid candidate selection.' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to submit votes. Please try again.' }, { status: 500 })
    }

    // Clear voter session immediately (after DB accepted vote)
    cookieStore.delete('voter_session')
    cookieStore.delete('voter_school_id')
    cookieStore.delete('voter_school_slug')


    return NextResponse.json({ success: true, voteHash })
  } catch (error) {
    console.error('[omicron] Vote submission error:', error)
    return NextResponse.json({ error: 'Failed to submit votes. Please try again.' }, { status: 500 })
  }
}

