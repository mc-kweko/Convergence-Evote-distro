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

    await supabase.from('votes').delete().eq('school_id', adminSession.schoolId)
    await supabase.from('candidates').delete().eq('school_id', adminSession.schoolId)
    await supabase.from('positions').delete().eq('school_id', adminSession.schoolId)
    await supabase.from('students').delete().eq('school_id', adminSession.schoolId)
    await supabase.from('ballots').delete().eq('school_id', adminSession.schoolId)
    await supabase.from('audit_logs').delete().eq('school_id', adminSession.schoolId)

    return NextResponse.json({ success: true, message: 'System reset successfully' })
  } catch (error) {
    console.error('Error resetting system:', error)
    return NextResponse.json({ error: 'Failed to reset system' }, { status: 500 })
  }
}
