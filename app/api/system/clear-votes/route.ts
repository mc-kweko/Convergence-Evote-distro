import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateAdminSession } from '@/lib/admin-session'

export async function POST(request: NextRequest) {
  try {
    const adminSession = await validateAdminSession()
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    await supabase.from('votes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    await supabase
      .from('students')
      .update({ has_voted: false, voted_at: null })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    await supabase
      .from('candidates')
      .update({ vote_count: 0 })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    return NextResponse.json({ success: true, message: 'Votes cleared successfully' })
  } catch (error) {
    console.error('Error clearing votes:', error)
    return NextResponse.json({ error: 'Failed to clear votes' }, { status: 500 })
  }
}
