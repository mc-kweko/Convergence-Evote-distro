import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { generateSecurePin } from '@/lib/security'
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

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(worksheet)

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 })
    }

    const students = data.map((row: any) => ({
      student_id: row['Student ID'] || row['student_id'] || row['ID'] || row['id'] || '',
      name: row['Student Name'] || row['Name'] || row['name'],
      email: row['Email'] || row['email'] || null,
      phone: row['Phone'] || row['phone'] || null,
      class: row['Class'] || row['class'] || null,
      pin: generateSecurePin(),
      pin_generated_at: new Date().toISOString(),
      has_voted: false,
    }))

    const validStudents = students.filter((s: any) => s.name)

    if (validStudents.length === 0) {
      return NextResponse.json({ error: 'No valid students found. Student Name is required.' }, { status: 400 })
    }

    const { data: imported, error } = await supabase
      .from('students')
      .insert(validStudents)
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message || 'Failed to import students' }, { status: 500 })
    }

    return NextResponse.json({
      message: `Successfully imported ${imported.length} students`,
      count: imported.length,
    })
  } catch (error) {
    console.error('Error importing students:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to import students' 
    }, { status: 500 })
  }
}
