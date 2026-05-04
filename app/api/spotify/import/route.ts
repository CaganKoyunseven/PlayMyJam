import { NextRequest, NextResponse } from 'next/server';

import { isAdminAuthed } from '@/lib/admin-auth';
import { importPlaylist } from '@/lib/spotify-api';

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { playlistId } = await req.json();
  if (!playlistId) {
    return NextResponse.json({ error: 'Missing playlistId' }, { status: 400 });
  }

  try {
    const result = await importPlaylist(playlistId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
