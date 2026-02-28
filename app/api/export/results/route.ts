import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateResultsPdf } from '@/lib/pdf-generator'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('*')
      .order('created_at', { ascending: true })

    if (posError) throw posError

    const reportPositions = []
    for (const position of positions) {
      const { data: candidates, error: candError } = await supabase
        .from('candidates')
        .select('*')
        .eq('position_id', position.id)
        .order('vote_count', { ascending: false })

      if (candError) throw candError

      reportPositions.push({
        title: position.name,
        candidates: candidates.map((c: any) => ({
          name: c.name,
          voteCount: c.vote_count || 0,
        })),
      })
    }

    const pdfBuffer = await generateResultsPdf({
      electionName: 'Jinja College Electoral Commission',
      generatedAt: new Date(),
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
