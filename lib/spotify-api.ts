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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let playlistData: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawItems: any[] = [];

  // Approach 1: Venue token — full playlist response (embeds up to 100 tracks)
  try {
    playlistData = await spotifyFetch(`/playlists/${spotifyPlaylistId}`, true);
    rawItems = playlistData?.tracks?.items ?? [];
    console.log(`[importPlaylist] venue token: ${rawItems.length} raw items, total=${playlistData?.tracks?.total}`);
  } catch (e) {
    console.error('[importPlaylist] venue token failed:', (e as Error).message);
  }

  // Approach 2: Client Credentials — works for public playlists, no Dev Mode user restriction
  if (rawItems.length === 0) {
    try {
      const ccData = await spotifyFetch(`/playlists/${spotifyPlaylistId}`, false);
      if (!playlistData) playlistData = ccData;
      rawItems = ccData?.tracks?.items ?? [];
      console.log(`[importPlaylist] CC /playlists: ${rawItems.length} raw items`);
    } catch (e) {
      console.error('[importPlaylist] CC /playlists failed:', (e as Error).message);
    }
  }

  // Approach 3: Client Credentials on /tracks endpoint specifically
  if (rawItems.length === 0) {
    try {
      const tracksData = await spotifyFetch(`/playlists/${spotifyPlaylistId}/tracks?limit=100`, false);
      rawItems = tracksData?.items ?? [];
      console.log(`[importPlaylist] CC /tracks: ${rawItems.length} raw items`);
    } catch (e) {
      console.error('[importPlaylist] CC /tracks failed:', (e as Error).message);
    }
  }

  // Extract valid music tracks (filter out podcasts, null entries, local files)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tracks: SpotifyTrackItem[] = rawItems
    .filter((i: any) => i?.track?.id && i?.track?.name) // eslint-disable-line @typescript-eslint/no-explicit-any
    .map((i: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      spotifyTrackId: i.track.id,
      title: i.track.name,
      artist: i.track.artists?.map((a: { name: string }) => a.name).join(', ') ?? 'Unknown',
      album: i.track.album?.name ?? '',
      albumArt: i.track.album?.images?.[0]?.url ?? null,
      durationMs: i.track.duration_ms ?? 0,
    }));

  console.log(`[importPlaylist] extracted ${tracks.length} valid tracks from ${rawItems.length} raw items`);

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
