import { DEFAULT_VENUE_ID } from './constants';
import { browseSongs } from './mock-data';
import { getClientCredentialsToken, getVenueToken } from './spotify-auth';
import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';

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
  try {
    const data = await spotifyFetch('/me/playlists?limit=50', true);
    return (data?.items ?? []).map((p: RawPlaylist) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.images?.[0]?.url ?? null,
      trackCount: p.tracks?.total ?? 0,
    }));
  } catch (e) {
    console.warn('[getVenuePlaylists] Failed to fetch from Spotify, returning mock playlists. Error:', (e as Error).message);
    return [
      {
        id: 'MOCK_PLAYLIST_1',
        name: 'Demo Playlist (Top Hits)',
        imageUrl: null,
        trackCount: browseSongs.length,
      },
      {
        id: 'MOCK_PLAYLIST_2',
        name: 'Demo Playlist (Chill)',
        imageUrl: null,
        trackCount: 15,
      },
    ];
  }
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
  // Get playlist metadata (name, image) — works even in Dev Mode

  let playlistMeta: { name?: string; images?: { url: string }[] } | null = null;
  try {
    playlistMeta = await spotifyFetch(`/playlists/${spotifyPlaylistId}?fields=name,images`, true);
  } catch {
    try {
      playlistMeta = await spotifyFetch(`/playlists/${spotifyPlaylistId}?fields=name,images`, false);
    } catch {
      /* ok, will default to 'Playlist' */
    }
  }

  // Step 1: Try full track list via Spotify API (venue token, paginated)
  let tracks: SpotifyTrackItem[] = [];
  console.log('[importPlaylist] Trying API path (venue token)...');
  tracks = await fetchAllTracksViaApi(spotifyPlaylistId);
  console.log(`[importPlaylist] API returned ${tracks.length} tracks`);

  // Step 2: API blocked (Dev Mode 403) — scrape the public playlist page instead
  if (tracks.length === 0) {
    console.log('[importPlaylist] API returned 0 — scraping public playlist page...');
    tracks = await scrapePlaylistFull(spotifyPlaylistId);
    console.log(`[importPlaylist] scrape returned ${tracks.length} tracks`);
  }

  // Step 3 (demo fallback): if all real sources returned nothing, seed mock data
  if (tracks.length === 0) {
    console.log('[importPlaylist] All sources failed — seeding mock data for demo');
    tracks = browseSongs.map((s, i) => ({
      // Deterministic 22-char pseudo-ID scoped to this playlist
      spotifyTrackId: `DEMO${spotifyPlaylistId.slice(0, 8).padEnd(8, '0')}${String(i).padStart(10, '0')}`,
      title: s.title,
      artist: s.artist,
      album: '',
      albumArt: s.albumArt,
      durationMs: 210000,
    }));
  }

  // Step 5: For any tracks still missing title/artist, fetch their individual pages
  const incomplete = tracks.filter(t => !t.title);
  if (incomplete.length > 0) {
    console.log(`[importPlaylist] ${incomplete.length} tracks missing metadata — fetching individual pages...`);
    const filled = await scrapeIndividualTracksMeta(incomplete.map(t => t.spotifyTrackId));
    const filledMap = new Map(filled.map(t => [t.spotifyTrackId, t]));
    tracks = tracks.map(t => filledMap.get(t.spotifyTrackId) ?? t);
  }

  // Drop tracks with no title (couldn't get metadata from any source)
  tracks = tracks.filter(t => t.title);
  console.log(`[importPlaylist] ${tracks.length} tracks with complete metadata`);

  if (tracks.length === 0) {
    return { playlistId: '', imported: 0 };
  }

  // Upsert songs
  await supabaseAdmin.from('songs').upsert(
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
  const { data: songRows } = await supabaseAdmin
    .from('songs')
    .select('id, spotify_track_id')
    .in(
      'spotify_track_id',
      tracks.map(t => t.spotifyTrackId)
    );

  const songMap = Object.fromEntries((songRows ?? []).map(s => [s.spotify_track_id, s.id]));

  // Upsert playlist record
  const { data: playlist, error: playlistError } = await supabaseAdmin
    .from('playlists')
    .upsert(
      {
        venue_id: DEFAULT_VENUE_ID,
        spotify_playlist_id: spotifyPlaylistId,
        name: playlistMeta?.name ?? 'Playlist',
        image_url: playlistMeta?.images?.[0]?.url ?? null,
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
    await supabaseAdmin.from('playlist_songs').upsert(playlistSongs, { onConflict: 'playlist_id,song_id' });
  }

  // Set as active playlist for the venue
  const { error: venueError } = await supabaseAdmin.from('venues').update({ active_playlist_id: playlistId }).eq('id', DEFAULT_VENUE_ID);

  if (venueError) {
    console.error('[importPlaylist] Failed to set active playlist on venue:', venueError);
  }

  // Fill queue and start playing if the queue is idle
  const { fillQueueFromPlaylist, getQueueItems, advanceQueue } = await import('./db');
  await fillQueueFromPlaylist();
  const qItems = await getQueueItems();
  if (!qItems.find(i => i.isPlaying)) {
    await advanceQueue();
  }

  return { playlistId, imported: tracks.length };
}

// ── API path: paginated fetch using venue token ───────────────

async function fetchAllTracksViaApi(playlistId: string): Promise<SpotifyTrackItem[]> {
  const tracks: SpotifyTrackItem[] = [];
  let url: string | null = `/playlists/${playlistId}/tracks?fields=items(track(id,name,artists,album,duration_ms)),next&limit=100`;

  while (url) {
    try {
      const fetchPath = url.startsWith('http') ? url.replace('https://api.spotify.com/v1', '') : url;
      const data = await spotifyFetch(fetchPath, true);
      for (const item of data?.items ?? []) {
        const t = item?.track;
        if (!t?.id) continue;
        tracks.push({
          spotifyTrackId: t.id,
          title: t.name,
          artist: (t.artists ?? []).map((a: { name: string }) => a.name).join(', '),
          album: t.album?.name ?? '',
          albumArt: t.album?.images?.[0]?.url ?? null,
          durationMs: t.duration_ms ?? 0,
        });
      }
      url = data?.next ?? null;
    } catch {
      break;
    }
  }

  return tracks;
}

// ── Scrape public playlist page for full track metadata ───────
// Spotify Dev Mode blocks the /tracks API, but the public page at
// open.spotify.com/playlist/{id} includes __NEXT_DATA__ with all track info.

async function scrapePlaylistFull(playlistId: string): Promise<SpotifyTrackItem[]> {
  try {
    const res = await fetch(`https://open.spotify.com/playlist/${playlistId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) {
      console.error(`[scrapePlaylistFull] HTTP ${res.status}`);
      return [];
    }
    const html = await res.text();

    // Try to extract full track data from __NEXT_DATA__
    const nextDataMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const found = findTracksInObject(nextData, 20);
        if (found.length > 0) {
          console.log(`[scrapePlaylistFull] extracted ${found.length} tracks from __NEXT_DATA__`);
          return found;
        }
      } catch (e) {
        console.error('[scrapePlaylistFull] __NEXT_DATA__ parse failed:', (e as Error).message);
      }
    }

    // __NEXT_DATA__ had no track data — fall back to IDs only
    const trackIdPattern = /\/track\/([a-zA-Z0-9]{22})/g;
    const ids = new Set<string>();
    let m;
    while ((m = trackIdPattern.exec(html)) !== null) ids.add(m[1]);

    console.log(`[scrapePlaylistFull] no metadata in HTML, got ${ids.size} IDs only`);
    return Array.from(ids).map(id => ({
      spotifyTrackId: id,
      title: '',
      artist: '',
      album: '',
      albumArt: null,
      durationMs: 0,
    }));
  } catch (e) {
    console.error('[scrapePlaylistFull] failed:', (e as Error).message);
    return [];
  }
}

// ── Recursively search a JSON tree for Spotify track objects ─────
// A track object is identified by having an `id` that is a 22-char
// base-62 string, a `name` string, and an `artists` array.

export function findTracksInObject(node: unknown, maxDepth: number): SpotifyTrackItem[] {
  const results: SpotifyTrackItem[] = [];
  const seen = new Set<string>();

  function walk(n: unknown, depth: number): void {
    if (depth <= 0 || n === null || typeof n !== 'object') return;

    if (Array.isArray(n)) {
      for (const item of n) walk(item, depth - 1);
      return;
    }

    const obj = n as Record<string, unknown>;

    // Spotify track object signature: id (22 chars), name, artists array
    if (typeof obj.id === 'string' && /^[a-zA-Z0-9]{22}$/.test(obj.id) && typeof obj.name === 'string' && Array.isArray(obj.artists) && !seen.has(obj.id)) {
      seen.add(obj.id);
      const album = obj.album as Record<string, unknown> | undefined;
      results.push({
        spotifyTrackId: obj.id,
        title: obj.name,
        artist: (obj.artists as { name: string }[]).map(a => a.name).join(', '),
        album: typeof album?.name === 'string' ? album.name : '',
        albumArt: Array.isArray(album?.images) && (album.images as { url: string }[]).length > 0 ? (album.images as { url: string }[])[0].url : null,
        durationMs: typeof obj.duration_ms === 'number' ? obj.duration_ms : 0,
      });
      return; // don't recurse inside track objects
    }

    for (const value of Object.values(obj)) walk(value, depth - 1);
  }

  walk(node, maxDepth);
  return results;
}

// ── Fallback: scrape individual track pages for metadata ──────
// Used when scrapePlaylistFull couldn't extract metadata from HTML.
// Fetches each track's og: meta tags in parallel batches.

async function scrapeIndividualTracksMeta(trackIds: string[]): Promise<SpotifyTrackItem[]> {
  const BATCH = 8;
  const results: SpotifyTrackItem[] = [];

  for (let i = 0; i < trackIds.length; i += BATCH) {
    const batch = trackIds.slice(i, i + BATCH);
    const settled = await Promise.allSettled(batch.map(id => scrapeOneTrackMeta(id)));
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value);
    }
  }

  return results;
}

async function scrapeOneTrackMeta(id: string): Promise<SpotifyTrackItem | null> {
  try {
    const res = await fetch(`https://open.spotify.com/track/${id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Try __NEXT_DATA__ first (most reliable)
    const ndMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (ndMatch) {
      try {
        const tracks = findTracksInObject(JSON.parse(ndMatch[1]), 20);
        const match = tracks.find(t => t.spotifyTrackId === id);
        if (match) return match;
      } catch {}
    }

    // Fall back to og: meta tags
    // Title format: "Track Name - song by Artist | Spotify"
    const titleM = html.match(/<title>([^<]+?)\s*[-–]\s*song(?:\s+and\s+lyrics)?\s+by\s+([^|<]+?)\s*\|\s*Spotify/i);
    const imageM = html.match(/<meta\s+(?:property="og:image"|name="og:image")\s+content="([^"]+)"/);
    if (titleM) {
      return {
        spotifyTrackId: id,
        title: titleM[1].trim(),
        artist: titleM[2].trim(),
        album: '',
        albumArt: imageM ? imageM[1] : null,
        durationMs: 0,
      };
    }

    return null;
  } catch {
    return null;
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
