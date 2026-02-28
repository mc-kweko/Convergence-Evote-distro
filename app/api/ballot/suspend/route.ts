import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ballot_id, reason } = body

    if (!ballot_id || !reason) {
      return NextResponse.json(
        { error: 'Ballot ID and reason are required' },
        { status: 400 }
      )
    }

    // Update ballot status to suspended
    const { data: ballot, error: updateError } = await supabase
      .from('ballots')
      .update({
        status: 'suspended',
        suspension_reason: reason,
        suspended_at: new Date().toISOString(),
      })
      .eq('id', ballot_id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log audit - emergency action
    await supabase.from('audit_logs').insert({
      action: 'BALLOT_SUSPENDED',
      details: `Ballot suspended. Reason: ${reason}`,
      performed_by: session.user.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
    })

    return NextResponse.json({
      message: 'Ballot suspended successfully',
      ballot,
    })
  } catch (error) {
    console.error('Error suspending ballot:', error)
    return NextResponse.json({ error: 'Failed to suspend ballot' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ballot_id } = body

    if (!ballot_id) {
      return NextResponse.json({ error: 'Ballot ID is required' }, { status: 400 })
    }

    // Resume ballot - set status to active
    const { data: ballot, error: updateError } = await supabase
      .from('ballots')
      .update({
        status: 'active',
        suspension_reason: null,
        suspended_at: null,
      })
      .eq('id', ballot_id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log audit
    await supabase.from('audit_logs').insert({
      action: 'BALLOT_RESUMED',
      details: `Ballot resumed`,
      performed_by: session.user.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
    })

    return NextResponse.json({
      message: 'Ballot resumed successfully',
      ballot,
    })
  } catch (error) {
    console.error('Error resuming ballot:', error)
    return NextResponse.json({ error: 'Failed to resume ballot' }, { status: 500 })
  }
}
