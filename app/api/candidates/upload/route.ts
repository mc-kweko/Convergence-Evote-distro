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
    const formData = await request.formData()
    const file = formData.get('file') as File
    const candidateId = formData.get('candidateId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileName = `${candidateId}-${Date.now()}.${file.name.split('.').pop()}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('candidate-photos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('candidate-photos')
      .getPublicUrl(fileName)

    if (candidateId) {
      await supabase
        .from('candidates')
        .update({ photo_url: publicUrl })
        .eq('id', candidateId)
        .eq('school_id', adminSession.schoolId)
    }

    return NextResponse.json({ url: publicUrl, success: true })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
