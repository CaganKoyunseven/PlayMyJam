import { NextResponse } from 'next/server';

import { isAdminAuthed } from '@/lib/admin-auth';
import { DEFAULT_VENUE_ID } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: venue } = await supabase.from('venues').select('spotify_access_token').eq('id', DEFAULT_VENUE_ID).single();

  if (!venue?.spotify_access_token) {
    return NextResponse.json({ error: 'No venue token' });
  }

  const token = venue.spotify_access_token;

  // Get user's playlists
  const meRes = await fetch('https://api.spotify.com/v1/me/playlists?limit=5', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = meRes.ok ? await meRes.json() : null;
  const playlists = meData?.items ?? [];
  const firstMusicPlaylist = playlists.find((p: { name: string }) => p.name !== 'Deutsch Podcast A1/A2') ?? playlists[0];

  if (!firstMusicPlaylist) {
    return NextResponse.json({ error: 'No playlists found' });
  }

  const pid = firstMusicPlaylist.id;
  const pname = firstMusicPlaylist.name;

  // Test API: fetch playlist details including tracks
  let apiResult: { tracksFound: number; sampleTracks: string[] } | string = 'not tested';
  try {
    const apiData = await (
      await fetch(`https://api.spotify.com/v1/playlists/${pid}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json();
    apiResult = {
      tracksFound: apiData?.tracks?.total ?? 0,
      sampleTracks: (apiData?.tracks?.items ?? []).slice(0, 3).map((it: { track?: { name: string } }) => it.track?.name),
    };
  } catch (e) {
    apiResult = (e as Error).message;
  }

  // Test scraping: fetch the public playlist page
  let scrapeResult:
    | {
        status: number;
        htmlLength: number;
        trackIdsFound: number;
        sampleTrackIds: string[];
        htmlSnippet: string;
      }
    | string = 'not tested';

  try {
    const res = await fetch(`https://open.spotify.com/playlist/${pid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PlayMyJam/1.0)',
        Accept: 'text/html',
      },
    });
    const html = await res.text();
    const trackIdPattern = /\/track\/([a-zA-Z0-9]{22})/g;
    const ids = new Set<string>();
    let match;
    while ((match = trackIdPattern.exec(html)) !== null) {
      ids.add(match[1]);
    }
    scrapeResult = {
      status: res.status,
      htmlLength: html.length,
      trackIdsFound: ids.size,
      sampleTrackIds: Array.from(ids).slice(0, 5),
      htmlSnippet: html.slice(0, 500),
    };
  } catch (e) {
    scrapeResult = (e as Error).message;
  }

  // If we found track IDs, test /tracks API with Client Credentials
  let tracksApiTest: string | object = 'no track IDs to test';
  const trackIds = typeof scrapeResult === 'object' ? scrapeResult.sampleTrackIds : [];
  if (trackIds.length > 0) {
    try {
      const clientId = process.env.SPOTIFY_CLIENT_ID!;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      const tokenData = await tokenRes.json();
      const ccToken = tokenData.access_token;

      const tracksRes = await fetch(`https://api.spotify.com/v1/tracks?ids=${trackIds.slice(0, 3).join(',')}`, {
        headers: { Authorization: `Bearer ${ccToken}` },
      });
      if (tracksRes.ok) {
        const data = await tracksRes.json();
        tracksApiTest = {
          status: 200,
          tracksReturned: data.tracks?.length,
          sample: data.tracks?.[0]
            ? {
                id: data.tracks[0].id,
                name: data.tracks[0].name,
                artist: data.tracks[0].artists?.[0]?.name,
              }
            : null,
        };
      } else {
        tracksApiTest = `${tracksRes.status} ${await tracksRes.text().catch(() => '')}`;
      }
    } catch (e) {
      tracksApiTest = (e as Error).message;
    }
  }

  return NextResponse.json({
    testPlaylist: { id: pid, name: pname },
    allPlaylists: playlists.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
    apiResult,
    scrapeResult,
    tracksApiTest,
  });
}
