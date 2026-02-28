import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { position_id } = body

    if (!position_id) {
      return NextResponse.json({ error: 'Position ID is required' }, { status: 400 })
    }

    // Get all candidates for the position
    const { data: candidates, error: candError } = await supabase
      .from('candidates')
      .select('id, name, position_id')
      .eq('position_id', position_id)

    if (candError) throw candError

    // Count votes for each candidate
    const results = []
    for (const candidate of candidates) {
      const { data: votes, error: voteError } = await supabase
        .from('votes')
        .select('id')
        .eq('candidate_id', candidate.id)
        .eq('status', 'completed')

      if (voteError) throw voteError

      results.push({
        candidate_id: candidate.id,
        candidate_name: candidate.name,
        vote_count: votes?.length || 0,
      })
    }

    // Log audit - security action
    await supabase.from('audit_logs').insert({
      action: 'MANUAL_RECOUNT',
      details: `Manual recount performed for position ${position_id}`,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
    })

    // Store recount record
    const { data: recount, error: recountError } = await supabase
      .from('recounts')
      .insert([
        {
          position_id,
          results: JSON.stringify(results),
          verified: false,
        },
      ])
      .select()
      .single()

    if (recountError) throw recountError

    return NextResponse.json({
      message: 'Recount completed successfully',
      results,
      recount_id: recount.id,
    })
  } catch (error) {
    console.error('Error performing recount:', error)
    return NextResponse.json({ error: 'Failed to perform recount' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const positionId = searchParams.get('position_id')

    let query = supabase.from('recounts').select('*').order('created_at', { ascending: false })

    if (positionId) {
      query = query.eq('position_id', positionId)
    }

    const { data: recounts, error } = await query

    if (error) throw error

    // Parse results for each recount
    const parsedRecounts = recounts.map((r: any) => ({
      ...r,
      results: JSON.parse(r.results),
    }))

    return NextResponse.json(parsedRecounts)
  } catch (error) {
    console.error('Error fetching recounts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
