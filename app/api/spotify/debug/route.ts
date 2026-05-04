import { NextResponse } from 'next/server';

import { isAdminAuthed } from '@/lib/admin-auth';
import { DEFAULT_VENUE_ID } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: venue } = await supabase
    .from('venues')
    .select('spotify_access_token, spotify_refresh_token, spotify_token_expires_at')
    .eq('id', DEFAULT_VENUE_ID)
    .single();

  if (!venue?.spotify_access_token) {
    return NextResponse.json({ error: 'No venue token found' });
  }

  const token = venue.spotify_access_token;

  // Get Client Credentials token for comparison
  let ccToken: string | null = null;
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    ccToken = data.access_token ?? null;
  } catch {
    /* ignore */
  }

  // Get user's first playlist
  const mePlaylistsRes = await fetch('https://api.spotify.com/v1/me/playlists?limit=5', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const mePlaylistsData = mePlaylistsRes.ok ? await mePlaylistsRes.json() : null;
  const playlists = mePlaylistsData?.items ?? [];
  const firstPlaylist = playlists[0];

  if (!firstPlaylist) {
    return NextResponse.json({ error: 'No playlists found', playlistCount: playlists.length });
  }

  const pid = firstPlaylist.id;
  const pname = firstPlaylist.name;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: Record<string, any> = {
    playlistId: pid,
    playlistName: pname,
    playlistsFromMeEndpoint: playlists.map((p: { id: string; name: string; tracks: { total: number } }) => ({
      id: p.id,
      name: p.name,
      tracksTotal: p.tracks?.total,
    })),
  };

  // Test 1: Venue token — /playlists/{id} (full response, no fields)
  try {
    const res = await fetch(`https://api.spotify.com/v1/playlists/${pid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      results.venueFullResponse = {
        topLevelKeys: Object.keys(data),
        hasTracksObj: !!data.tracks,
        tracksKeys: data.tracks ? Object.keys(data.tracks) : null,
        tracksTotal: data.tracks?.total,
        tracksItemsLength: data.tracks?.items?.length,
        firstTrackSample: data.tracks?.items?.[0]
          ? { hasTrack: !!data.tracks.items[0].track, trackId: data.tracks.items[0].track?.id, trackName: data.tracks.items[0].track?.name }
          : null,
      };
    } else {
      results.venueFullResponse = `${res.status} ${await res.text().catch(() => '')}`;
    }
  } catch (e) {
    results.venueFullResponse = (e as Error).message;
  }

  // Test 2: Venue token — /playlists/{id}?market=from_token
  try {
    const res = await fetch(`https://api.spotify.com/v1/playlists/${pid}?market=from_token`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      results.venueWithMarket = {
        tracksTotal: data.tracks?.total,
        tracksItemsLength: data.tracks?.items?.length,
        firstTrackId: data.tracks?.items?.[0]?.track?.id,
      };
    } else {
      results.venueWithMarket = `${res.status} ${await res.text().catch(() => '')}`;
    }
  } catch (e) {
    results.venueWithMarket = (e as Error).message;
  }

  // Test 3: Client Credentials — /playlists/{id}
  if (ccToken) {
    try {
      const res = await fetch(`https://api.spotify.com/v1/playlists/${pid}`, {
        headers: { Authorization: `Bearer ${ccToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        results.ccFullResponse = {
          tracksTotal: data.tracks?.total,
          tracksItemsLength: data.tracks?.items?.length,
          firstTrackId: data.tracks?.items?.[0]?.track?.id,
        };
      } else {
        results.ccFullResponse = `${res.status} ${await res.text().catch(() => '')}`;
      }
    } catch (e) {
      results.ccFullResponse = (e as Error).message;
    }

    // Test 4: Client Credentials — /playlists/{id}/tracks
    try {
      const res = await fetch(`https://api.spotify.com/v1/playlists/${pid}/tracks?limit=1`, {
        headers: { Authorization: `Bearer ${ccToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        results.ccTracksEndpoint = {
          total: data.total,
          itemsLength: data.items?.length,
          firstTrackId: data.items?.[0]?.track?.id,
        };
      } else {
        results.ccTracksEndpoint = `${res.status} ${await res.text().catch(() => '')}`;
      }
    } catch (e) {
      results.ccTracksEndpoint = (e as Error).message;
    }
  }

  return NextResponse.json(results);
}
