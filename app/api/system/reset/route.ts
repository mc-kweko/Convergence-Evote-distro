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
    await supabase.from('candidates').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('positions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('ballots').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    return NextResponse.json({ success: true, message: 'System reset successfully' })
  } catch (error) {
    console.error('Error resetting system:', error)
    return NextResponse.json({ error: 'Failed to reset system' }, { status: 500 })
  }
}
