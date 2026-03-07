export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('election_stats')
      .select('id, is_active, started_at, ended_at, total_students, students_voted, votes_cast, election_year')
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
    const endTime = data.ended_at ? new Date(data.ended_at).getTime() : 0
    const timeRemaining = endTime ? Math.max(0, Math.floor((endTime - now) / 1000)) : 0
    
    // Auto-deactivate if time has expired but still marked active
    if (data.is_active && timeRemaining === 0 && endTime > 0) {
      await supabase
        .from('election_stats')
        .update({ is_active: false })
        .eq('id', data.id)
      
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
    const supabase = await createClient()
    const { action, duration_minutes } = await request.json()

    if (action === 'start') {
      if (!duration_minutes || duration_minutes <= 0) {
        return NextResponse.json({ error: 'Duration is required' }, { status: 400 })
      }

      const now = Date.now()
      const startTime = new Date(now)
      const endTime = new Date(now + duration_minutes * 60 * 1000)

      // Get total students count and deactivate existing elections in parallel
      const [{ count: totalStudents }] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('election_stats').update({ is_active: false }).eq('is_active', true)
      ])

      const { data, error } = await supabase
        .from('election_stats')
        .insert({
          started_at: startTime.toISOString(),
          ended_at: endTime.toISOString(),
          is_active: true,
          total_students: totalStudents || 0,
          students_voted: 0,
          votes_cast: 0
        })
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({ success: true, data })
    }

    if (action === 'extend') {
      if (!duration_minutes || duration_minutes <= 0) {
        return NextResponse.json({ error: 'Duration is required' }, { status: 400 })
      }

      const { data: current, error: fetchError } = await supabase
        .from('election_stats')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fetchError || !current) {
        return NextResponse.json({ error: 'No active election found' }, { status: 404 })
      }

      const currentEndTime = new Date(current.ended_at)
      const newEndTime = new Date(currentEndTime.getTime() + duration_minutes * 60 * 1000)

      const { data, error } = await supabase
        .from('election_stats')
        .update({ ended_at: newEndTime.toISOString() })
        .eq('id', current.id)
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
        .select()

      if (error) throw error

      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error managing election:', error)
    return NextResponse.json({ error: 'Failed to manage election' }, { status: 500 })
  }
}
