import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Update last activity
    await supabase
      .from('sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', session.id);

    return NextResponse.json({
      user: session.users,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('[v0] Auth check error:', error);
    return NextResponse.json(
      { error: 'An error occurred during auth check' },
      { status: 500 }
    );
  }
}
