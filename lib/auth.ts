import { createClient } from './supabase/server';
import { cookies } from 'next/headers';

const SESSION_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session_token')?.value;

    if (!sessionToken) {
      return null;
    }

    const supabase = await createClient();

    // Verify the session in the database
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*, users(id, email, role)')
      .eq('token_hash', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return null;
    }

    return {
      user: session.users,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('[v0] Error getting session:', error);
    return null;
  }
}

export async function login(email: string, password: string, ipAddress?: string) {
  try {
    const supabase = await createClient();

    // Get user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      throw new Error('Invalid credentials');
    }

    // Verify password (in production, use bcrypt comparison)
    // For now, using simple comparison - in real app, hash and compare
    const passwordMatch = password === user.password_hash; // TODO: Use bcrypt

    if (!passwordMatch) {
      throw new Error('Invalid credentials');
    }

    // Check if user has the correct role
    if (user.role !== 'chairperson_electoral_commission') {
      throw new Error('Unauthorized role');
    }

    // Create session token
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const token = `${user.id}-${Date.now()}-${Math.random()}`;
    const tokenHash = Buffer.from(token).toString('base64');

    // Store session in database
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        ip_address: ipAddress,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error('Failed to create session');
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('admin_session_token', tokenHash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_MS / 1000,
      path: '/',
    });

    // Log login action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'LOGIN',
      ip_address: ipAddress,
      details: { success: true },
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    console.error('[v0] Login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
}

export async function logout() {
  try {
    const session = await getSession();
    if (!session) {
      return { success: true };
    }

    const supabase = await createClient();

    // Delete session from database
    await supabase
      .from('sessions')
      .delete()
      .eq('id', session.sessionId);

    // Clear session cookie
    const cookieStore = await cookies();
    cookieStore.delete('admin_session_token');

    // Log logout action
    await supabase.from('audit_logs').insert({
      user_id: session.user.id,
      action: 'LOGOUT',
      details: { success: true },
    });

    return { success: true };
  } catch (error) {
    console.error('[v0] Logout error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed',
    };
  }
}

export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session;
}
