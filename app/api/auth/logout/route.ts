import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session_token')?.value;

    if (sessionToken) {
      const supabase = await createClient();

      // Find and delete the session
      const { data: session } = await supabase
        .from('sessions')
        .select('id, user_id')
        .eq('token_hash', sessionToken)
        .single();

      if (session) {
        await supabase
          .from('sessions')
          .delete()
          .eq('id', session.id);

        // Log logout action
        await supabase.from('audit_logs').insert({
          user_id: session.user_id,
          action: 'LOGOUT',
          details: { success: true, timestamp: new Date().toISOString() },
        });
      }
    }

    // Clear session cookie
    const response = NextResponse.json({
      success: true,
    });

    response.cookies.delete('admin_session_token');

    return response;
  } catch (error) {
    console.error('[v0] Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
