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

export async function importPlaylist(spotifyPlaylistId: string): Promise<{ playlistId: string; imported: number }> {
  // Step 1: Get playlist metadata from API (works in Dev Mode)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let playlistData: any = null;
  try {
    playlistData = await spotifyFetch(`/playlists/${spotifyPlaylistId}`, true);
  } catch {
    try {
      playlistData = await spotifyFetch(`/playlists/${spotifyPlaylistId}`, false);
    } catch {
      /* metadata will be null, that's ok */
    }
  }

  // Step 2: Extract track IDs from API response if available (works for allowlisted Test Users)
  let trackIds: string[] = [];
  if (playlistData?.tracks?.items) {
    trackIds = playlistData.tracks.items.map((item: { track?: { id: string } }) => item.track?.id).filter(Boolean);
    console.log(`[importPlaylist] found ${trackIds.length} track IDs via API`);
  }

  // Step 3: Fallback to scraping only if API returned 0 tracks (Dev Mode restriction)
  if (trackIds.length === 0) {
    console.log('[importPlaylist] API returned 0 tracks, falling back to scraping...');
    trackIds = await scrapePlaylistTrackIds(spotifyPlaylistId);
    console.log(`[importPlaylist] scraped ${trackIds.length} track IDs from web page`);
  }

  if (trackIds.length === 0) {
    return { playlistId: '', imported: 0 };
  }

  // Step 4: Batch-fetch full track details via /tracks API (up to 50 per request)
  const tracks: SpotifyTrackItem[] = [];
  for (let i = 0; i < trackIds.length; i += 50) {
    const batch = trackIds.slice(i, i + 50);
    try {
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
    } catch (e) {
      console.error('[importPlaylist] /tracks batch failed:', (e as Error).message);
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
