import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import { hasSchoolEmailDomain, slugifySchoolName } from '@/lib/school'

export async function POST(request: NextRequest) {
  try {
    const { school_name, school_email, admin_email, password } = await request.json()

    if (!school_name || !school_email || !admin_email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (!hasSchoolEmailDomain(school_email) || !hasSchoolEmailDomain(admin_email)) {
      return NextResponse.json(
        { error: 'Please use a school email domain for onboarding' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const supabase = await createClient()
    const slugBase = slugifySchoolName(school_name)
    const slug = `${slugBase}-${Date.now().toString().slice(-6)}`

    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: school_name,
        school_email,
        slug,
        portal_live: false,
      })
      .select('id, name, slug')
      .single()

    if (schoolError || !school) {
      return NextResponse.json({ error: 'Failed to create school workspace' }, { status: 500 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const { error: userError } = await supabase.from('users').insert({
      email: admin_email,
      password_hash: passwordHash,
      role: 'school_admin',
      school_id: school.id,
    })

    if (userError) {
      await supabase.from('schools').delete().eq('id', school.id)
      if (userError.code === '23505') {
        return NextResponse.json({ error: 'Admin email already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create admin account' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      school,
      message: 'School workspace created. You can now sign in as admin.',
    })
  } catch (error) {
    console.error('School signup error:', error)
    return NextResponse.json({ error: 'Failed to complete signup' }, { status: 500 })
  }
}
