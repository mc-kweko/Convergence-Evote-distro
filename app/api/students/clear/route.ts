import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateAdminSession } from '@/lib/admin-session'

export async function DELETE(request: NextRequest) {
  try {
    const adminSession = await validateAdminSession()
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('school_id', adminSession.schoolId)
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) throw error

    return NextResponse.json({ success: true, message: 'All students cleared' })
  } catch (error) {
    console.error('Error clearing students:', error)
    return NextResponse.json({ error: 'Failed to clear students' }, { status: 500 })
  }
}
