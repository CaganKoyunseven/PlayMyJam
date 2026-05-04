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
  // Use Client Credentials (false) instead of venue token — Spotify Development Mode
  // blocks /playlists/{id} with user tokens. Client Credentials works for public playlists.
  const [playlistData, tracksData] = await Promise.all([
    spotifyFetch(`/playlists/${spotifyPlaylistId}?fields=id,name,images,tracks.total`, false),
    spotifyFetch(`/playlists/${spotifyPlaylistId}/tracks?limit=50&fields=items(track(id,name,artists,album,duration_ms))`, false),
  ]);

  type RawTrackItem = {
    track: { id: string; name: string; artists: { name: string }[]; album: { name: string; images: { url: string }[] }; duration_ms: number };
  };
  const tracks: SpotifyTrackItem[] = (tracksData?.items ?? [])
    .filter((i: RawTrackItem) => i?.track?.id)
    .map((i: RawTrackItem) => ({
      spotifyTrackId: i.track.id,
      title: i.track.name,
      artist: i.track.artists.map(a => a.name).join(', '),
      album: i.track.album?.name ?? '',
      albumArt: i.track.album?.images?.[0]?.url ?? null,
      durationMs: i.track.duration_ms ?? 0,
    }));

  // Upsert songs
  if (tracks.length > 0) {
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
  }

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
  const { data: playlist } = await supabase
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

  const playlistId = playlist!.id;

  // Upsert playlist_songs
  if (songRows && songRows.length > 0) {
    await supabase.from('playlist_songs').upsert(
      tracks
        .filter(t => songMap[t.spotifyTrackId])
        .map((t, i) => ({
          playlist_id: playlistId,
          song_id: songMap[t.spotifyTrackId],
          position: i,
        })),
      { onConflict: 'playlist_id,song_id' }
    );
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
