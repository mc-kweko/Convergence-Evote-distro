import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    // Get user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.error('[v0] User not found:', userError);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password (in production, use bcrypt comparison)
    if (password !== user.password_hash) {
      console.error('[v0] Invalid password');
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user has the correct role
    if (user.role !== 'chairperson_electoral_commission') {
      console.error('[v0] Unauthorized role:', user.role);
      return NextResponse.json(
        { error: 'You do not have permission to access this system' },
        { status: 403 }
      );
    }

    // Create session
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const tokenHash = Buffer.from(`${user.id}-${Date.now()}-${Math.random()}`).toString('base64');

    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent') || '',
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) {
      console.error('[v0] Session creation error:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Log login action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'LOGIN',
      ip_address: ipAddress,
      details: { success: true, timestamp: new Date().toISOString() },
    });

    // Set session cookie
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    );

    response.cookies.set('admin_session_token', tokenHash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[v0] Login API error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
