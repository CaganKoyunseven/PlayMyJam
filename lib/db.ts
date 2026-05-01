import { supabase } from './supabase';
import { DEFAULT_VENUE_ID } from './constants';
import { publish, EventType } from './event-bus';

export type QueueEntry = {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  waitMinutes: number;
  tokens: number;
};

export type UserProfile = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  tokens: number;
  totalRequests: number;
  songsAdded: number;
  favoriteVenue: string | null;
  isPremium: boolean;
  memberSince: string;
};

export async function getQueueEntries(): Promise<QueueEntry[]> {
  const { data } = await supabase
    .from('queue_entries')
    .select('*')
    .eq('venue_id', DEFAULT_VENUE_ID)
    .order('requested_at', { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.spotify_track_id,
    title: row.track_title,
    artist: row.track_artist,
    albumArt: row.album_art_url ?? '',
    waitMinutes: row.wait_minutes,
    tokens: row.tokens_spent,
  }));
}

export async function insertQueueEntry(entry: {
  spotifyTrackId: string;
  trackTitle: string;
  trackArtist: string;
  albumArtUrl?: string;
  userId?: string;
}): Promise<void> {
  await supabase.from('queue_entries').insert({
    spotify_track_id: entry.spotifyTrackId,
    track_title: entry.trackTitle,
    track_artist: entry.trackArtist,
    album_art_url: entry.albumArtUrl ?? null,
    venue_id: DEFAULT_VENUE_ID,
    user_id: entry.userId ?? null,
    wait_minutes: 0,
    tokens_spent: 1,
  });
}

// ── Queue Items (new table) ───────────────────────────────────

export type QueueItem = {
  id: string;
  songId: string;
  position: number;
  isPlaying: boolean;
  title: string;
  artist: string;
  albumArt: string;
  durationMs: number;
};

export async function getQueueItems(): Promise<QueueItem[]> {
  const { data } = await supabase
    .from('queue_items')
    .select('*, songs(title, artist, album_art, duration_ms)')
    .eq('venue_id', DEFAULT_VENUE_ID)
    .order('position', { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    songId: row.song_id,
    position: row.position,
    isPlaying: row.is_playing,
    title: row.songs?.title ?? '',
    artist: row.songs?.artist ?? '',
    albumArt: row.songs?.album_art ?? '',
    durationMs: row.songs?.duration_ms ?? 0,
  }));
}

export async function insertQueueItem(songId: string, position?: number): Promise<void> {
  const pos = position ?? Date.now();
  await supabase.from('queue_items').insert({
    venue_id: DEFAULT_VENUE_ID,
    song_id: songId,
    position: pos,
    is_playing: false,
  });
  publish(EventType.SONG_ADDED_TO_QUEUE, { songId }).catch(
    (err) => console.error('[db] publish SONG_ADDED_TO_QUEUE failed:', err)
  );
}

export async function updateQueueItemPosition(id: string, position: number): Promise<void> {
  await supabase.from('queue_items').update({ position }).eq('id', id);
}

export async function removeQueueItem(id: string): Promise<void> {
  await supabase.from('queue_items').delete().eq('id', id);
}

export async function setNowPlaying(id: string, spotifyTrackUri?: string, deviceId?: string): Promise<void> {
  await supabase.from('queue_items').update({ is_playing: false }).eq('venue_id', DEFAULT_VENUE_ID);
  await supabase.from('queue_items').update({ is_playing: true }).eq('id', id);
  publish(EventType.SONG_STARTED, { queueItemId: id, spotifyTrackUri: spotifyTrackUri ?? '', deviceId: deviceId ?? '' }).catch(
    (err) => console.error('[db] publish SONG_STARTED failed:', err)
  );
}

// ── Song Requests ─────────────────────────────────────────────

export async function insertSongRequest(songId: string, sessionId: string): Promise<void> {
  await supabase.from('song_requests').insert({
    venue_id: DEFAULT_VENUE_ID,
    song_id: songId,
    tokens_spent: 1,
    status: 'pending',
  });
  publish(EventType.SONG_REQUESTED, { songId, sessionId }).catch(
    (err) => console.error('[db] publish SONG_REQUESTED failed:', err)
  );
}

// ── Token Balances ────────────────────────────────────────────

export async function getOrCreateTokenBalance(sessionId: string): Promise<number> {
  const { data } = await supabase
    .from('token_balances')
    .select('balance')
    .eq('session_id', sessionId)
    .single();

  if (data) return data.balance;

  await supabase.from('token_balances').insert({ session_id: sessionId, balance: 10 });
  return 10;
}

export async function deductToken(sessionId: string): Promise<{ ok: boolean; balance: number }> {
  const { data } = await supabase
    .from('token_balances')
    .select('balance')
    .eq('session_id', sessionId)
    .single();

  const current = data?.balance ?? 0;
  if (current < 1) return { ok: false, balance: current };

  const newBalance = current - 1;
  await supabase
    .from('token_balances')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId);

  publish(EventType.TOKEN_SPENT, { sessionId, amount: 1, newBalance }).catch(
    (err) => console.error('[db] publish TOKEN_SPENT failed:', err)
  );

  return { ok: true, balance: newBalance };
}

// ── Playlists ─────────────────────────────────────────────────

export type PlaylistRow = {
  id: string;
  spotifyPlaylistId: string;
  name: string;
  imageUrl: string | null;
  trackCount: number;
};

export async function getVenueImportedPlaylists(): Promise<PlaylistRow[]> {
  const { data } = await supabase
    .from('playlists')
    .select('*')
    .eq('venue_id', DEFAULT_VENUE_ID)
    .order('imported_at', { ascending: false });

  return (data ?? []).map((p) => ({
    id: p.id,
    spotifyPlaylistId: p.spotify_playlist_id,
    name: p.name,
    imageUrl: p.image_url,
    trackCount: p.track_count,
  }));
}

export async function getPlaylistSongs(playlistId: string): Promise<QueueItem[]> {
  const { data } = await supabase
    .from('playlist_songs')
    .select('position, songs(id, title, artist, album_art, duration_ms)')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true });

  return (data ?? []).map((row: any) => ({
    id: row.songs.id,
    songId: row.songs.id,
    position: row.position,
    isPlaying: false,
    title: row.songs.title,
    artist: row.songs.artist,
    albumArt: row.songs.album_art ?? '',
    durationMs: row.songs.duration_ms ?? 0,
  }));
}

// ── User Profile ──────────────────────────────────────────────

export async function getUserProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    tokens: data.tokens,
    totalRequests: data.total_requests,
    songsAdded: data.songs_added,
    favoriteVenue: data.favorite_venue,
    isPremium: data.is_premium,
    memberSince: new Date(data.created_at).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
  };
}
