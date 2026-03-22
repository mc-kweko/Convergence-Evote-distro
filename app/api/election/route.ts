export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateAdminSession } from '@/lib/admin-session'
import { cookies } from 'next/headers'
import { parseTimestampMs } from '@/lib/time'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const schoolSlug = request.nextUrl.searchParams.get('school') || cookieStore.get('voter_school_slug')?.value
    let schoolId: string | null = null

    if (schoolSlug) {
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('slug', schoolSlug)
        .single()

      if (schoolError || !school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 })
      }

      schoolId = school.id
    } else {
      const adminSession = await validateAdminSession()
      if (!adminSession) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      schoolId = adminSession.schoolId
    }

    const { data, error } = await supabase
      .from('election_stats')
      .select('id, is_active, started_at, ended_at, total_students, students_voted, votes_cast, election_year')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    if (!data) {
      return NextResponse.json(
        { is_active: false, started_at: null, ended_at: null, time_remaining: 0 },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    const now = Date.now()
    const endTime = parseTimestampMs(data.ended_at)
    const timeRemaining = endTime ? Math.max(0, Math.floor((endTime - now) / 1000)) : 0
    
    // Auto-deactivate if time has expired but still marked active
    if (data.is_active && timeRemaining === 0 && endTime > 0) {
      await supabase
        .from('election_stats')
        .update({ is_active: false })
        .eq('id', data.id)
        .eq('school_id', schoolId)
      
      data.is_active = false
    }

    return NextResponse.json(
      { ...data, time_remaining: timeRemaining },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    console.error('Error fetching election status:', error)
    return NextResponse.json({ error: 'Failed to fetch election status' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminSession = await validateAdminSession()
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { action, duration_minutes } = await request.json()

    const startElection = async () => {
      if (!duration_minutes || duration_minutes <= 0) {
        return { error: 'Duration is required', status: 400 as const }
      }

      const now = Date.now()
      const startTime = new Date(now)
      const endTime = new Date(now + duration_minutes * 60 * 1000)

      const [{ count: totalStudents }] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', adminSession.schoolId),
        supabase.from('election_stats').update({ is_active: false }).eq('is_active', true).eq('school_id', adminSession.schoolId),
      ])

      const { data, error } = await supabase
        .from('election_stats')
        .insert({
          started_at: startTime.toISOString(),
          ended_at: endTime.toISOString(),
          is_active: true,
          total_students: totalStudents || 0,
          students_voted: 0,
          votes_cast: 0,
          school_id: adminSession.schoolId,
        })
        .select()
        .single()

      if (error || !data) {
        throw new Error(error?.message || 'Failed to start election')
      }

      return { data }
    }

    if (action === 'start') {
      const result = await startElection()
      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.status })
      }

      return NextResponse.json({ success: true, data: result.data })
    }

    if (action === 'deploy_and_start') {
      const result = await startElection()
      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.status })
      }

      const { data: school, error: deployError } = await supabase
        .from('schools')
        .update({ portal_live: true })
        .eq('id', adminSession.schoolId)
        .select('slug, name, portal_live')
        .single()

      if (deployError || !school) {
        await supabase
          .from('election_stats')
          .update({ is_active: false })
          .eq('id', result.data.id)
          .eq('school_id', adminSession.schoolId)

        return NextResponse.json({ error: 'Failed to deploy election portal' }, { status: 500 })
      }

      const origin = request.nextUrl.origin
      return NextResponse.json({
        success: true,
        data: result.data,
        portal_url: `${origin}/portal/${school.slug}`,
        school,
      })
    }

    if (action === 'extend') {
      if (!duration_minutes || duration_minutes <= 0) {
        return NextResponse.json({ error: 'Duration is required' }, { status: 400 })
      }

      const { data: current, error: fetchError } = await supabase
        .from('election_stats')
        .select('*')
        .eq('is_active', true)
        .eq('school_id', adminSession.schoolId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fetchError || !current) {
        return NextResponse.json({ error: 'No active election found' }, { status: 404 })
      }

      const currentEndTimeMs = parseTimestampMs(current.ended_at)
      if (!currentEndTimeMs) {
        return NextResponse.json({ error: 'Invalid current election end time' }, { status: 500 })
      }

      const newEndTime = new Date(currentEndTimeMs + duration_minutes * 60 * 1000)

      const { data, error } = await supabase
        .from('election_stats')
        .update({ ended_at: newEndTime.toISOString() })
        .eq('id', current.id)
        .eq('school_id', adminSession.schoolId)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({ success: true, data })
    }

    if (action === 'stop') {
      const { data, error } = await supabase
        .from('election_stats')
        .update({ 
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('is_active', true)
        .eq('school_id', adminSession.schoolId)
        .select()

      if (error) throw error

      return NextResponse.json({ success: true, data })
    }

    if (action === 'deploy_portal') {
      const { data: school, error } = await supabase
        .from('schools')
        .update({ portal_live: true })
        .eq('id', adminSession.schoolId)
        .select('slug, name, portal_live')
        .single()

      if (error || !school) {
        return NextResponse.json({ error: 'Failed to deploy election portal' }, { status: 500 })
      }

      const origin = request.nextUrl.origin
      return NextResponse.json({
        success: true,
        portal_url: `${origin}/portal/${school.slug}`,
        school,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error managing election:', error)
    return NextResponse.json({ error: 'Failed to manage election' }, { status: 500 })
  }
}
