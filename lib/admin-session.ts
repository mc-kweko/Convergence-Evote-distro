import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export interface AdminSession {
  sessionId: string
  userId: string
}

export async function validateAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('admin_session_token')?.value

  if (!sessionToken) {
    return null
  }

  const supabase = await createClient()
  const { data: session, error } = await supabase
    .from('sessions')
    .select('id, user_id, users!inner(role)')
    .eq('token_hash', sessionToken)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !session) {
    return null
  }

  const userRole = Array.isArray(session.users) ? session.users[0]?.role : (session.users as any)?.role
  if (userRole !== 'chairperson_electoral_commission') {
    return null
  }

  return {
    sessionId: session.id,
    userId: session.user_id,
  }
}