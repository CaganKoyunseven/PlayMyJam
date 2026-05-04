import { NextRequest, NextResponse } from 'next/server';

import { isAdminAuthed } from '@/lib/admin-auth';
import { importPlaylist } from '@/lib/spotify-api';

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { playlistId } = await req.json();
  // Spotify IDs are base-62 alphanumeric strings — reject anything else to prevent SSRF
  if (!playlistId || !/^[a-zA-Z0-9]+$/.test(playlistId)) {
    return NextResponse.json({ error: 'Invalid playlistId' }, { status: 400 });
  }

  try {
    const result = await importPlaylist(playlistId);
    return NextResponse.json(result);
  } catch (e) {
    const msg = (e as Error).message;
    console.error('[spotify/import] error:', msg);
    console.error('[spotify/import] full error:', e);
    // Surface the error detail to the client for admin visibility
    return NextResponse.json({ error: msg, hint: 'If "Forbidden", try disconnecting and reconnecting Spotify from the Spotify tab.' }, { status: 500 });
  }
}
