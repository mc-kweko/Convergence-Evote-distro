import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateAdminSession } from '@/lib/admin-session'

export async function DELETE(
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

    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'Invalid candidate ID' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      console.error('Supabase delete error:', error)
      return NextResponse.json({ 
        error: `Database error: ${error.message}`,
        details: error 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Candidate deleted successfully',
      deletedCount: data?.length || 0
    })
  } catch (error) {
    console.error('Unexpected error deleting candidate:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

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
    const body = await request.json()
    const { name, student_id, manifesto } = body

    const { data, error } = await supabase
      .from('candidates')
      .update({ name, student_id, manifesto })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating candidate:', error)
    return NextResponse.json({ error: 'Failed to update candidate' }, { status: 500 })
  }
}
