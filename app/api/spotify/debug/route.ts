import { NextResponse } from 'next/server';

import { isAdminAuthed } from '@/lib/admin-auth';
import { DEFAULT_VENUE_ID } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Read raw venue token info from DB
  const { data: venue, error: dbError } = await supabase
    .from('venues')
    .select('spotify_access_token, spotify_refresh_token, spotify_token_expires_at')
    .eq('id', DEFAULT_VENUE_ID)
    .single();

  if (dbError || !venue) {
    return NextResponse.json({ error: 'Venue not found', dbError, venueId: DEFAULT_VENUE_ID });
  }

  const tokenPreview = venue.spotify_access_token ? venue.spotify_access_token.slice(0, 20) + '...' : null;
  const hasRefresh = !!venue.spotify_refresh_token;
  const expiresAt = venue.spotify_token_expires_at;

  // 2. Call Spotify /me to check who this token belongs to and if it works
  let meResult: Record<string, unknown> | null = null;
  let meError: string | null = null;
  if (venue.spotify_access_token) {
    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${venue.spotify_access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        meResult = { display_name: data.display_name, email: data.email, id: data.id, product: data.product };
      } else {
        meError = `${res.status} ${await res.text().catch(() => '')}`;
      }
    } catch (e) {
      meError = (e as Error).message;
    }
  }

  // 3. Try a simple public playlist fetch (Spotify's "Today's Top Hits" - always public)
  let publicPlaylistTest: string | null = null;
  if (venue.spotify_access_token) {
    try {
      const res = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M?fields=id,name', {
        headers: { Authorization: `Bearer ${venue.spotify_access_token}` },
      });
      publicPlaylistTest = `${res.status} ${res.ok ? 'OK' : await res.text().catch(() => '')}`;
    } catch (e) {
      publicPlaylistTest = (e as Error).message;
    }
  }

  // 4. Try /me/playlists to list user's own playlists
  let myPlaylistsTest: string | null = null;
  if (venue.spotify_access_token) {
    try {
      const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=1', {
        headers: { Authorization: `Bearer ${venue.spotify_access_token}` },
      });
      myPlaylistsTest = `${res.status} ${res.ok ? 'OK' : await res.text().catch(() => '')}`;
    } catch (e) {
      myPlaylistsTest = (e as Error).message;
    }
  }

  return NextResponse.json({
    venueId: DEFAULT_VENUE_ID,
    tokenPreview,
    hasRefreshToken: hasRefresh,
    expiresAt,
    spotifyUser: meResult,
    spotifyUserError: meError,
    publicPlaylistTest,
    myPlaylistsTest,
  });
}
