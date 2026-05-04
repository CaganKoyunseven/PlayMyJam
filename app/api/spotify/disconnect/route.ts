import { NextResponse } from 'next/server';

import { isAdminAuthed } from '@/lib/admin-auth';
import { DEFAULT_VENUE_ID } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

export async function POST() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { error } = await supabase
      .from('venues')
      .update({
        spotify_access_token: null,
        spotify_refresh_token: null,
        spotify_token_expires_at: null,
      })
      .eq('id', DEFAULT_VENUE_ID);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message;
    console.error('[spotify/disconnect] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
