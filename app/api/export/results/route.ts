import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateResultsPdf } from '@/lib/pdf-generator'
import { validateAdminSession } from '@/lib/admin-session'

export async function GET(request: NextRequest) {
  try {
    const adminSession = await validateAdminSession()
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get total eligible voters
    const { count: totalEligibleVoters } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', adminSession.schoolId)

    // Get total votes cast
    const { count: totalVotesCast } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', adminSession.schoolId)
      .eq('has_voted', true)

    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('*')
      .eq('school_id', adminSession.schoolId)
      .order('created_at', { ascending: true })

    if (posError) throw posError

    const reportPositions = []
    for (const position of positions) {
      const { data: candidates, error: candError } = await supabase
        .from('candidates')
        .select('*')
        .eq('position_id', position.id)
        .eq('school_id', adminSession.schoolId)
        .order('vote_count', { ascending: false })

      if (candError) throw candError

      const totalValidVotes = candidates.reduce((sum: number, c: any) => sum + (c.vote_count || 0), 0)

      reportPositions.push({
        title: position.name,
        totalValidVotes,
        candidates: candidates.map((c: any) => ({
          name: c.name,
          voteCount: c.vote_count || 0,
        })),
      })
    }

    const pdfBuffer = await generateResultsPdf({
      electionName: 'Convergence E-Vote',
      generatedAt: new Date(),
      pollDate: new Date(),
      totalEligibleVoters: totalEligibleVoters || 0,
      totalVotesCast: totalVotesCast || 0,
      positions: reportPositions,
    })

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="election_results.pdf"',
      },
    })
  } catch (error) {
    console.error('Error exporting results:', error)
    return NextResponse.json({ error: 'Failed to export results' }, { status: 500 })
  }
}
