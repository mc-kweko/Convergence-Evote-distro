import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: schools, error } = await supabase
      .from('schools')
      .select('id, name, slug, portal_live')
      .eq('portal_live', true)
      .order('name', { ascending: true })

    if (error) throw error

    // Attach active election flag for each school
    const schoolsWithStatus = await Promise.all(
      (schools || []).map(async (school) => {
        const { data: election } = await supabase
          .from('election_stats')
          .select('is_active, ended_at')
          .eq('school_id', school.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const now = Date.now()
        let hasActiveElection = false
        if (election?.is_active && election.ended_at) {
          const endMs = Date.parse(
            /[zZ]|[+-]\d{2}:\d{2}$/.test(election.ended_at)
              ? election.ended_at
              : election.ended_at + 'Z'
          )
          hasActiveElection = !isNaN(endMs) && now < endMs
        }

        return { id: school.id, name: school.name, slug: school.slug, hasActiveElection }
      })
    )

    return NextResponse.json(schoolsWithStatus)
  } catch (error) {
    console.error('[omicron] Error fetching schools:', error)
    return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 })
  }
}
