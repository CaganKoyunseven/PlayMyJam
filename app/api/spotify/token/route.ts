import { NextResponse } from 'next/server';
import { getVenueToken } from '@/lib/spotify-auth';
import { isAdminAuthed } from '@/lib/admin-auth';

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ token: null, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = await getVenueToken();
    if (!token) {
      return NextResponse.json({ token: null, error: 'Venue not connected to Spotify' }, { status: 401 });
    }
    return NextResponse.json({ token });
  } catch (e) {
    return NextResponse.json({ token: null, error: (e as Error).message }, { status: 500 });
  }
}
