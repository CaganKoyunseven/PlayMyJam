import { DEFAULT_VENUE_ID } from './constants';
import { getClientCredentialsToken, getVenueToken } from './spotify-auth';
import { supabase } from './supabase';

async function spotifyFetch(path: string, useVenueToken = false, options: RequestInit = {}) {
  const token = useVenueToken ? await getVenueToken() : await getClientCredentialsToken();

  if (!token) throw new Error('No Spotify token available');

  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 204) return null;
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    let errMsg: string;
    try {
      const parsed = JSON.parse(errBody);
      errMsg = parsed?.error?.message || `Spotify API error ${res.status}`;
    } catch {
      errMsg = `Spotify API error ${res.status}`;
    }
    throw new Error(`${errMsg} (HTTP ${res.status}) — body: ${errBody.slice(0, 300)}`);
  }

  return res.json();
}

// ── Connection check ──────────────────────────────────────────

export async function checkSpotifyConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const { data } = await supabase.from('venues').select('spotify_access_token').eq('id', DEFAULT_VENUE_ID).single();
    return { connected: !!data?.spotify_access_token };
  } catch (e) {
    return { connected: false, error: (e as Error).message };
  }
}

// ── Venue playlists (requires venue token) ────────────────────

export type SpotifyPlaylist = {
  id: string;
  name: string;
  imageUrl: string | null;
  trackCount: number;
};

type RawPlaylist = { id: string; name: string; images: { url: string }[]; tracks: { total: number } };

export async function getVenuePlaylists(): Promise<SpotifyPlaylist[]> {
  const data = await spotifyFetch('/me/playlists?limit=50', true);
  return (data?.items ?? []).map((p: RawPlaylist) => ({
    id: p.id,
    name: p.name,
    imageUrl: p.images?.[0]?.url ?? null,
    trackCount: p.tracks?.total ?? 0,
  }));
}

// ── Import selected playlist into DB ─────────────────────────

export type SpotifyTrackItem = {
  spotifyTrackId: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string | null;
  durationMs: number;
};

// ── Fetch all track IDs from a playlist via the dedicated /tracks endpoint ──
// This handles Spotify pagination (max 100 items per page).
// Uses venue token since Dev Mode blocks CC tokens on this endpoint.
async function fetchPlaylistTrackIds(spotifyPlaylistId: string): Promise<string[]> {
  const allIds: string[] = [];
  let url: string | null = `/playlists/${spotifyPlaylistId}/tracks?fields=items(track(id)),next,total&limit=100`;

  while (url) {
    try {
      // If it's a full URL (pagination next link), extract the path
      const fetchPath = url.startsWith('http') ? url.replace('https://api.spotify.com/v1', '') : url;

      const data = await spotifyFetch(fetchPath, true);

      if (data?.items) {
        for (const item of data.items) {
          if (item?.track?.id) {
            allIds.push(item.track.id);
          }
        }
      }

      // Spotify returns a `next` URL for pagination, or null when done
      url = data?.next ?? null;
    } catch (e) {
      console.error('[fetchPlaylistTrackIds] failed:', (e as Error).message);
      break;
    }
  }

  return allIds;
}

export async function importPlaylist(spotifyPlaylistId: string): Promise<{ playlistId: string; imported: number }> {
  // Step 1: Get playlist metadata from API (works in Dev Mode for allowlisted users)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let playlistData: any = null;
  try {
    playlistData = await spotifyFetch(`/playlists/${spotifyPlaylistId}?fields=name,images,tracks.total`, true);
  } catch {
    try {
      playlistData = await spotifyFetch(`/playlists/${spotifyPlaylistId}?fields=name,images,tracks.total`, false);
    } catch {
      /* metadata will be null, that's ok */
    }
  }

  // Step 2: Fetch track IDs using the dedicated /tracks endpoint (paginated, venue token)
  // This is the CORRECT way — the /playlists/{id} response only includes the first page of tracks,
  // but /playlists/{id}/tracks properly paginates through ALL tracks.
  let trackIds: string[] = [];
  console.log('[importPlaylist] Trying dedicated /tracks endpoint with venue token...');
  trackIds = await fetchPlaylistTrackIds(spotifyPlaylistId);
  console.log(`[importPlaylist] /tracks endpoint returned ${trackIds.length} track IDs`);

  // Step 3: If /tracks endpoint failed (Dev Mode 403), try extracting from inline playlist response
  if (trackIds.length === 0 && playlistData?.tracks?.items) {
    console.log('[importPlaylist] /tracks endpoint returned 0, trying inline tracks from playlist response...');
    trackIds = playlistData.tracks.items.map((item: { track?: { id: string } }) => item.track?.id).filter(Boolean);
    console.log(`[importPlaylist] found ${trackIds.length} track IDs from inline response`);
  }

  // Step 4: Fallback to scraping only if API returned 0 tracks
  if (trackIds.length === 0) {
    console.log('[importPlaylist] API returned 0 tracks, falling back to scraping...');
    trackIds = await scrapePlaylistTrackIds(spotifyPlaylistId);
    console.log(`[importPlaylist] scraped ${trackIds.length} track IDs from web page`);
  }

  if (trackIds.length === 0) {
    return { playlistId: '', imported: 0 };
  }

  // Step 5: Batch-fetch full track details via /tracks API (up to 50 per request)
  // IMPORTANT: Use venue token (true) — Client Credentials gets 403 in Dev Mode!
  const tracks: SpotifyTrackItem[] = [];
  for (let i = 0; i < trackIds.length; i += 50) {
    const batch = trackIds.slice(i, i + 50);
    try {
      const data = await spotifyFetch(`/tracks?ids=${batch.join(',')}`, true);
      for (const t of data?.tracks ?? []) {
        if (!t?.id) continue;
        tracks.push({
          spotifyTrackId: t.id,
          title: t.name,
          artist: t.artists?.map((a: { name: string }) => a.name).join(', ') ?? 'Unknown',
          album: t.album?.name ?? '',
          albumArt: t.album?.images?.[0]?.url ?? null,
          durationMs: t.duration_ms ?? 0,
        });
      }
    } catch (e) {
      console.error(`[importPlaylist] /tracks batch ${i / 50 + 1} failed:`, (e as Error).message);
      // Try with CC token as last resort for this batch
      try {
        console.log(`[importPlaylist] Retrying batch ${i / 50 + 1} with CC token...`);
        const data = await spotifyFetch(`/tracks?ids=${batch.join(',')}`, false);
        for (const t of data?.tracks ?? []) {
          if (!t?.id) continue;
          tracks.push({
            spotifyTrackId: t.id,
            title: t.name,
            artist: t.artists?.map((a: { name: string }) => a.name).join(', ') ?? 'Unknown',
            album: t.album?.name ?? '',
            albumArt: t.album?.images?.[0]?.url ?? null,
            durationMs: t.duration_ms ?? 0,
          });
        }
      } catch (e2) {
        console.error(`[importPlaylist] /tracks batch ${i / 50 + 1} CC fallback also failed:`, (e2 as Error).message);
      }
    }
  }

  console.log(`[importPlaylist] fetched ${tracks.length} full tracks from API`);

  if (tracks.length === 0) {
    return { playlistId: '', imported: 0 };
  }

  // Upsert songs
  await supabase.from('songs').upsert(
    tracks.map(t => ({
      spotify_track_id: t.spotifyTrackId,
      title: t.title,
      artist: t.artist,
      album: t.album,
      album_art: t.albumArt,
      duration_ms: t.durationMs,
    })),
    { onConflict: 'spotify_track_id' }
  );

  // Fetch song IDs
  const { data: songRows } = await supabase
    .from('songs')
    .select('id, spotify_track_id')
    .in(
      'spotify_track_id',
      tracks.map(t => t.spotifyTrackId)
    );

  const songMap = Object.fromEntries((songRows ?? []).map(s => [s.spotify_track_id, s.id]));

  // Upsert playlist record
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .upsert(
      {
        venue_id: DEFAULT_VENUE_ID,
        spotify_playlist_id: spotifyPlaylistId,
        name: playlistData?.name ?? 'Playlist',
        image_url: playlistData?.images?.[0]?.url ?? null,
        track_count: tracks.length,
      },
      { onConflict: 'venue_id,spotify_playlist_id' }
    )
    .select('id')
    .single();

  if (!playlist?.id) {
    console.error('[importPlaylist] playlist upsert failed:', playlistError);
    throw new Error('Failed to save playlist record');
  }

  const playlistId = playlist.id;

  // Upsert playlist_songs
  const playlistSongs = tracks
    .filter(t => songMap[t.spotifyTrackId])
    .map((t, i) => ({
      playlist_id: playlistId,
      song_id: songMap[t.spotifyTrackId],
      position: i,
    }));

  if (playlistSongs.length > 0) {
    await supabase.from('playlist_songs').upsert(playlistSongs, { onConflict: 'playlist_id,song_id' });
  }

  return { playlistId, imported: tracks.length };
}

// ── Scrape track IDs from Spotify public playlist page ───────
// Spotify Dev Mode blocks track data via API, but the public web page
// at open.spotify.com/playlist/{id} lists all tracks with links.
// We extract track IDs from those links.

async function scrapePlaylistTrackIds(playlistId: string): Promise<string[]> {
  try {
    const res = await fetch(`https://open.spotify.com/playlist/${playlistId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PlayMyJam/1.0)',
        Accept: 'text/html',
      },
    });
    if (!res.ok) {
      console.error(`[scrapePlaylist] HTTP ${res.status} for playlist ${playlistId}`);
      return [];
    }
    const html = await res.text();

    // Extract track IDs from links like /track/0MAAh257gKxFrJDzfJ4gHC
    const trackIdPattern = /\/track\/([a-zA-Z0-9]{22})/g;
    const ids = new Set<string>();
    let match;
    while ((match = trackIdPattern.exec(html)) !== null) {
      ids.add(match[1]);
    }
    return Array.from(ids);
  } catch (e) {
    console.error('[scrapePlaylist] failed:', (e as Error).message);
    return [];
  }
}

// ── Track search (client credentials) ────────────────────────

export type SpotifyTrackResult = {
  spotifyTrackId: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string | null;
  durationMs: number;
};

export async function searchTracks(query: string): Promise<SpotifyTrackResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) return [];
  return res.json();
}

// ── Playback (requires venue token + Spotify Premium) ─────────

export async function startPlayback(deviceId: string, spotifyPlaylistUri: string) {
  return spotifyFetch(`/me/player/play?device_id=${deviceId}`, true, {
    method: 'PUT',
    body: JSON.stringify({ context_uri: spotifyPlaylistUri }),
  });
}

export async function playTrack(deviceId: string, trackUri: string) {
  return spotifyFetch(`/me/player/play?device_id=${deviceId}`, true, {
    method: 'PUT',
    body: JSON.stringify({ uris: [trackUri] }),
  });
}

export async function pausePlayback() {
  return spotifyFetch('/me/player/pause', true, { method: 'PUT' });
}

export async function resumePlayback() {
  return spotifyFetch('/me/player/play', true, { method: 'PUT' });
}

export async function skipToNext() {
  return spotifyFetch('/me/player/next', true, { method: 'POST' });
}

export async function getCurrentlyPlaying() {
  return spotifyFetch('/me/player/currently-playing', true);
}
