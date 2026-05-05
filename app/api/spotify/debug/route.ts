import { NextResponse } from 'next/server';

import { isAdminAuthed } from '@/lib/admin-auth';
import { DEFAULT_VENUE_ID } from '@/lib/constants';
import { getVenueToken } from '@/lib/spotify-auth';
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: venue } = await supabase.from('venues').select('spotify_access_token, spotify_token_expires_at').eq('id', DEFAULT_VENUE_ID).single();

  if (!venue?.spotify_access_token) {
    return NextResponse.json({ error: 'No venue token in DB' });
  }

  const directToken = venue.spotify_access_token;
  const tokenExpiresAt = venue.spotify_token_expires_at;
  const tokenExpired = tokenExpiresAt ? Date.now() > new Date(tokenExpiresAt).getTime() : 'unknown';

  // Test whether getVenueToken() (the same path importPlaylist uses) returns a token
  let venueTokenResult: string | null = null;
  let venueTokenError: string | null = null;
  try {
    venueTokenResult = await getVenueToken();
  } catch (e) {
    venueTokenError = (e as Error).message;
  }

  // Get user's playlists using direct token
  const meRes = await fetch('https://api.spotify.com/v1/me/playlists?limit=5', {
    headers: { Authorization: `Bearer ${directToken}` },
  });
  const meData = meRes.ok ? await meRes.json() : null;
  const playlists = meData?.items ?? [];
  const firstMusicPlaylist = playlists.find((p: { name: string }) => p.name !== 'Deutsch Podcast A1/A2') ?? playlists[0];

  if (!firstMusicPlaylist) {
    return NextResponse.json({
      error: 'No playlists found',
      tokenInfo: {
        directTokenPrefix: directToken.slice(0, 20) + '...',
        tokenExpiresAt,
        tokenExpired,
        getVenueTokenReturns: venueTokenResult ? venueTokenResult.slice(0, 20) + '...' : null,
        getVenueTokenError: venueTokenError,
      },
    });
  }

  const pid = firstMusicPlaylist.id;
  const pname = firstMusicPlaylist.name;

  // Test API with direct token — show raw status and body so we can see 403 errors
  let apiResult: unknown = 'not tested';
  try {
    const apiRes = await fetch(`https://api.spotify.com/v1/playlists/${pid}`, {
      headers: { Authorization: `Bearer ${directToken}` },
    });
    const apiBody = await apiRes.text();
    if (apiRes.ok) {
      const apiData = JSON.parse(apiBody);
      apiResult = {
        status: 200,
        tracksTotal: apiData?.tracks?.total ?? 0,
        tracksInlineCount: (apiData?.tracks?.items ?? []).length,
        sampleTracks: (apiData?.tracks?.items ?? []).slice(0, 3).map((it: { track?: { name: string } }) => it?.track?.name),
      };
    } else {
      apiResult = { status: apiRes.status, body: apiBody.slice(0, 300) };
    }
  } catch (e) {
    apiResult = { error: (e as Error).message };
  }

  // Test scraping
  let scrapeResult: unknown = 'not tested';
  let scrapedIds: string[] = [];
  try {
    const res = await fetch(`https://open.spotify.com/playlist/${pid}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PlayMyJam/1.0)', Accept: 'text/html' },
    });
    const html = await res.text();
    const trackIdPattern = /\/track\/([a-zA-Z0-9]{22})/g;
    const ids = new Set<string>();
    let match;
    while ((match = trackIdPattern.exec(html)) !== null) {
      ids.add(match[1]);
    }
    scrapedIds = Array.from(ids);
    scrapeResult = {
      status: res.status,
      htmlLength: html.length,
      trackIdsFound: scrapedIds.length,
      sampleTrackIds: scrapedIds.slice(0, 5),
    };
  } catch (e) {
    scrapeResult = { error: (e as Error).message };
  }

  // Test /tracks?ids= with DIRECT token (same as what's in the DB)
  let tracksTestDirect: unknown = 'no track IDs';
  // Test /tracks?ids= with getVenueToken() result (same path as importPlaylist)
  let tracksTestVenueToken: unknown = 'no track IDs';

  if (scrapedIds.length > 0) {
    const sampleIds = scrapedIds.slice(0, 3).join(',');

    // Test 1: direct token from DB
    try {
      const res = await fetch(`https://api.spotify.com/v1/tracks?ids=${sampleIds}`, {
        headers: { Authorization: `Bearer ${directToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        tracksTestDirect = {
          status: 200,
          tracksReturned: data.tracks?.length,
          sample: data.tracks?.[0] ? { id: data.tracks[0].id, name: data.tracks[0].name, artist: data.tracks[0].artists?.[0]?.name } : null,
        };
      } else {
        tracksTestDirect = { status: res.status, body: await res.text().catch(() => '') };
      }
    } catch (e) {
      tracksTestDirect = { error: (e as Error).message };
    }

    // Test 2: getVenueToken() result (the path importPlaylist actually uses)
    if (venueTokenResult) {
      try {
        const res = await fetch(`https://api.spotify.com/v1/tracks?ids=${sampleIds}`, {
          headers: { Authorization: `Bearer ${venueTokenResult}` },
        });
        if (res.ok) {
          const data = await res.json();
          tracksTestVenueToken = {
            status: 200,
            tracksReturned: data.tracks?.length,
            sample: data.tracks?.[0] ? { id: data.tracks[0].id, name: data.tracks[0].name, artist: data.tracks[0].artists?.[0]?.name } : null,
          };
        } else {
          tracksTestVenueToken = { status: res.status, body: await res.text().catch(() => '') };
        }
      } catch (e) {
        tracksTestVenueToken = { error: (e as Error).message };
      }
    } else {
      tracksTestVenueToken = { error: `getVenueToken() returned null. getVenueToken error: ${venueTokenError}` };
    }
  }

  return NextResponse.json({
    testPlaylist: { id: pid, name: pname },
    tokenInfo: {
      directTokenPrefix: directToken.slice(0, 20) + '...',
      tokenExpiresAt,
      tokenExpired,
      getVenueTokenReturns: venueTokenResult ? venueTokenResult.slice(0, 20) + '...' : null,
      getVenueTokenError: venueTokenError,
      tokensMatch: venueTokenResult != null ? venueTokenResult.slice(0, 20) === directToken.slice(0, 20) : false,
    },
    allPlaylists: playlists.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
    apiResult,
    scrapeResult,
    tracksTestDirect,
    tracksTestVenueToken,
  });
}
