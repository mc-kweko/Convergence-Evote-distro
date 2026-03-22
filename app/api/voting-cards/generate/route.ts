import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateVotingCardsPdf } from '@/lib/pdf-generator'
import { validateAdminSession } from '@/lib/admin-session'

export async function POST(request: NextRequest) {
  try {
    const adminSession = await validateAdminSession()
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('id, student_id, name, pin')
      .eq('has_voted', false)

    if (studentError) throw studentError

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: 'No students found' },
        { status: 400 }
      )
    }

    const pdfBuffer = await generateVotingCardsPdf(
      students.map((s) => ({
        studentId: s.student_id,
        pin: s.pin,
        name: s.name,
      }))
    )

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="voting_cards.pdf"',
      },
    })
  } catch (error) {
    console.error('Error generating voting cards:', error)
    return NextResponse.json({ error: 'Failed to generate voting cards' }, { status: 500 })
  }
}
