import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { decryptVote } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { vote_id, voting_pin } = body

    if (!vote_id || !voting_pin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get vote record
    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .select('*, student:students(*), candidate:candidates(*)')
      .eq('vote_id', vote_id)
      .single()

    if (voteError || !vote) {
      return NextResponse.json({ error: 'Vote not found' }, { status: 404 })
    }

    // Verify PIN matches student
    if (vote.student.voting_pin !== voting_pin) {
      return NextResponse.json({ error: 'Invalid PIN for verification' }, { status: 401 })
    }

    // Generate encryption key from voting pin
    const crypto = require('crypto')
    const encryptionKey = crypto
      .createHash('sha256')
      .update(voting_pin + 'salt123')
      .digest('hex')

    try {
      // Attempt to decrypt vote data
      const decryptedData = decryptVote(vote.encrypted_data, encryptionKey)
      const voteData = JSON.parse(decryptedData)

      // Log audit
      await supabase.from('audit_logs').insert({
        action: 'VOTE_VERIFIED',
        details: `Vote ${vote_id} verified successfully`,
      })

      return NextResponse.json({
        verified: true,
        vote_data: voteData,
        candidate: vote.candidate,
        timestamp: vote.created_at,
      })
    } catch (error) {
      // Vote data is tampered
      await supabase.from('audit_logs').insert({
        action: 'VOTE_TAMPER_DETECTED',
        details: `Tamper detected on vote ${vote_id}`,
      })

      return NextResponse.json(
        { verified: false, error: 'Vote data integrity check failed' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error verifying vote:', error)
    return NextResponse.json({ error: 'Failed to verify vote' }, { status: 500 })
  }
}
