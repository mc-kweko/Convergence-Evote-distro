import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateAdminSession } from '@/lib/admin-session'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await validateAdminSession()
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { id } = await params
    const { is_active } = await request.json()

    const { data, error } = await supabase
      .from('positions')
      .update({ is_active })
      .eq('id', id)
      .eq('school_id', adminSession.schoolId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error toggling position:', error)
    return NextResponse.json({ error: 'Failed to toggle position' }, { status: 500 })
  }
}
