import { DEFAULT_VENUE_ID } from './constants';
import { publish, EventType } from './event-bus';
import { supabase } from './supabase';

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
  const { data } = await supabase.from('queue_entries').select('*').eq('venue_id', DEFAULT_VENUE_ID).order('requested_at', { ascending: true });

  return (data ?? []).map(row => ({
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
  startedAt: string | null;
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

  return (data ?? []).map(row => ({
    id: row.id,
    songId: row.song_id,
    position: row.position,
    isPlaying: row.is_playing,
    startedAt: row.started_at ?? null,
    title: row.songs?.title ?? '',
    artist: row.songs?.artist ?? '',
    albumArt: row.songs?.album_art ?? '',
    durationMs: row.songs?.duration_ms ?? 0,
  }));
}

export async function insertQueueItem(songId: string, position?: number): Promise<void> {
  const pos = position ?? Math.floor(Date.now() / 1000);
  const { error } = await supabase.from('queue_items').insert({
    venue_id: DEFAULT_VENUE_ID,
    song_id: songId,
    position: pos,
    is_playing: false,
  });
  if (error) {
    console.error('[db] insertQueueItem failed:', error);
  }
  publish(EventType.SONG_ADDED_TO_QUEUE, { songId }).catch(err => console.error('[db] publish SONG_ADDED_TO_QUEUE failed:', err));
}

export async function updateQueueItemPosition(id: string, position: number): Promise<void> {
  await supabase.from('queue_items').update({ position }).eq('id', id);
}

export async function removeQueueItem(id: string): Promise<void> {
  await supabase.from('queue_items').delete().eq('id', id);
}

export async function setNowPlaying(id: string, spotifyTrackUri?: string, deviceId?: string): Promise<void> {
  const { error: e1 } = await supabase.from('queue_items').update({ is_playing: false, started_at: null }).eq('venue_id', DEFAULT_VENUE_ID);
  if (e1) console.error('[db] setNowPlaying reset failed:', e1);

  const { error: e2 } = await supabase.from('queue_items').update({ is_playing: true, started_at: new Date().toISOString() }).eq('id', id);
  if (e2) console.error('[db] setNowPlaying set true failed:', e2);

  publish(EventType.SONG_STARTED, { queueItemId: id, spotifyTrackUri: spotifyTrackUri ?? '', deviceId: deviceId ?? '' }).catch(err =>
    console.error('[db] publish SONG_STARTED failed:', err)
  );
}

// ── Song Requests ─────────────────────────────────────────────

export type SongRequest = {
  id: string;
  songId: string;
  title: string;
  artist: string;
  albumArt: string;
  sessionId: string | null;
  requestedAt: string;
};

export async function getPendingRequests(): Promise<SongRequest[]> {
  const { data } = await supabase
    .from('song_requests')
    .select('id, song_id, session_id, requested_at, songs(title, artist, album_art)')
    .eq('venue_id', DEFAULT_VENUE_ID)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  type RequestRow = {
    id: string;
    song_id: string;
    session_id: string | null;
    requested_at: string;
    songs: { title: string; artist: string; album_art: string } | { title: string; artist: string; album_art: string }[] | null;
  };
  return (data ?? []).map((row: RequestRow) => {
    const songs = Array.isArray(row.songs) ? row.songs[0] : row.songs;
    return {
      id: row.id,
      songId: row.song_id,
      title: songs?.title ?? '',
      artist: songs?.artist ?? '',
      albumArt: songs?.album_art ?? '',
      sessionId: row.session_id ?? null,
      requestedAt: row.requested_at,
    };
  });
}

// Admin approves an out-of-playlist request:
// adds the song to all venue playlists + publishes SONG_ADDED_TO_LIBRARY
export async function approveRequest(requestId: string, songId: string, sessionId: string | null): Promise<void> {
  // Get song info for notification payload
  const { data: song } = await supabase.from('songs').select('title, artist').eq('id', songId).single();

  // Add song to all venue playlists so it shows up in browse
  const { data: playlists } = await supabase.from('playlists').select('id').eq('venue_id', DEFAULT_VENUE_ID);

  if (playlists && playlists.length > 0) {
    await supabase.from('playlist_songs').upsert(
      playlists.map(pl => ({ playlist_id: pl.id, song_id: songId, position: 99999 })),
      { onConflict: 'playlist_id,song_id' }
    );
  }

  await supabase.from('song_requests').update({ status: 'accepted' }).eq('id', requestId);

  // Add the approved request directly to the queue
  await insertQueueItem(songId);

  // Jump-start the player if nothing is playing
  const items = await getQueueItems();
  if (!items.find(i => i.isPlaying)) {
    await advanceQueue();
  }

  publish(EventType.SONG_ADDED_TO_LIBRARY, {
    songId,
    title: song?.title ?? '',
    artist: song?.artist ?? '',
    requestedBySessionId: sessionId,
  }).catch(err => console.error('[db] publish SONG_ADDED_TO_LIBRARY failed:', err));
}

export async function rejectRequest(requestId: string): Promise<void> {
  await supabase.from('song_requests').update({ status: 'rejected' }).eq('id', requestId);
  publish(EventType.SONG_REJECTED, { requestId }).catch(err => console.error('[db] publish SONG_REJECTED failed:', err));
}

// Used by /request page: out-of-playlist song request (free, no token)
// Upserts song to songs table first, then creates pending request
export async function createSongRequest(
  track: { spotifyTrackId: string; title: string; artist: string; album: string; albumArt: string | null; durationMs: number },
  sessionId: string
): Promise<{ ok: boolean; reason?: string }> {
  // Upsert song
  const { error: songErr } = await supabase.from('songs').upsert(
    {
      spotify_track_id: track.spotifyTrackId,
      title: track.title,
      artist: track.artist,
      album: track.album,
      album_art: track.albumArt,
      duration_ms: track.durationMs,
    },
    { onConflict: 'spotify_track_id' }
  );
  if (songErr) return { ok: false, reason: songErr.message };

  // Get song id
  const { data: songRow } = await supabase.from('songs').select('id').eq('spotify_track_id', track.spotifyTrackId).single();

  if (!songRow) return { ok: false, reason: 'Song upsert failed' };

  // Check if already requested (pending) for this venue
  const { data: existing } = await supabase
    .from('song_requests')
    .select('id')
    .eq('venue_id', DEFAULT_VENUE_ID)
    .eq('song_id', songRow.id)
    .in('status', ['pending', 'accepted'])
    .maybeSingle();

  if (existing) return { ok: false, reason: 'already_requested' };

  const { error: insertErr } = await supabase.from('song_requests').insert({
    venue_id: DEFAULT_VENUE_ID,
    song_id: songRow.id,
    session_id: sessionId,
    tokens_spent: 0,
    status: 'pending',
  });

  if (insertErr) {
    console.error('[db] song_requests insert failed:', insertErr.message);
    return { ok: false, reason: insertErr.message };
  }

  publish(EventType.SONG_REQUESTED, { songId: songRow.id, sessionId }).catch(err => console.error('[db] publish SONG_REQUESTED failed:', err));

  return { ok: true };
}

// Legacy: kept for any existing callers, no longer used by browse page
export async function insertSongRequest(songId: string, sessionId: string): Promise<void> {
  await supabase.from('song_requests').insert({
    venue_id: DEFAULT_VENUE_ID,
    song_id: songId,
    session_id: sessionId,
    tokens_spent: 1,
    status: 'accepted',
  });
}

// ── Token Balances ────────────────────────────────────────────

export async function getOrCreateTokenBalance(sessionId: string): Promise<number> {
  const { data } = await supabase.from('token_balances').select('balance').eq('session_id', sessionId).single();

  if (data) return data.balance;

  await supabase.from('token_balances').insert({ session_id: sessionId, balance: 10 });
  return 10;
}

export async function deductToken(sessionId: string): Promise<{ ok: boolean; balance: number }> {
  const { data: current } = await supabase.from('token_balances').select('balance').eq('session_id', sessionId).maybeSingle();

  const balance = current?.balance ?? 0;
  if (balance < 1) return { ok: false, balance };

  // Optimistic lock: WHERE balance = current prevents double-spend under concurrency.
  // If two requests race, only one will match the extra eq condition; the other gets 0 rows.
  const { data: updated } = await supabase
    .from('token_balances')
    .update({ balance: balance - 1, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('balance', balance)
    .select('balance');

  if (!updated || updated.length === 0) {
    return { ok: false, balance: 0 };
  }

  const newBalance = updated[0].balance as number;
  publish(EventType.TOKEN_SPENT, { sessionId, amount: 1, newBalance }).catch(err => console.error('[db] publish TOKEN_SPENT failed:', err));

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
  const { data } = await supabase.from('playlists').select('*').eq('venue_id', DEFAULT_VENUE_ID).order('imported_at', { ascending: false });

  return (data ?? []).map(p => ({
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

  type SongJoin = { id: string; title: string; artist: string; album_art: string | null; duration_ms: number };
  type PlaylistSongRow = { position: number; songs: SongJoin | SongJoin[] };
  return (data ?? []).map((row: PlaylistSongRow) => {
    const song = Array.isArray(row.songs) ? row.songs[0] : row.songs;
    return {
      id: song.id,
      songId: song.id,
      position: row.position,
      isPlaying: false as const,
      startedAt: null,
      title: song.title,
      artist: song.artist,
      albumArt: song.album_art ?? '',
      durationMs: song.duration_ms ?? 0,
    };
  });
}

// Ensure the queue has upcoming songs from the active playlist
export async function fillQueueFromPlaylist(): Promise<void> {
  const items = await getQueueItems();
  const upcomingCount = items.filter(i => !i.isPlaying).length;

  if (upcomingCount >= 10) return; // Target 10 upcoming songs

  const { data: venue } = await supabase.from('venues').select('active_playlist_id').eq('id', DEFAULT_VENUE_ID).single();
  if (!venue?.active_playlist_id) return;

  const { data: pSongs } = await supabase.from('playlist_songs').select('song_id').eq('playlist_id', venue.active_playlist_id);
  if (!pSongs || pSongs.length === 0) return;

  // Prevent duplicate songs in the queue
  const existingSongIds = new Set(items.map(i => i.songId));
  const availableSongs = pSongs.filter(s => !existingSongIds.has(s.song_id));

  // If we ran out of unique songs, we can just use the full list to keep music playing
  const pool = availableSongs.length > 0 ? availableSongs : pSongs;

  const needed = 10 - upcomingCount;
  for (let i = 0; i < needed; i++) {
    const randomSong = pool[Math.floor(Math.random() * pool.length)];
    // Provide a slightly incremented timestamp so positions are strictly ordered (in seconds)
    await insertQueueItem(randomSong.song_id, Math.floor(Date.now() / 1000) + i);
    existingSongIds.add(randomSong.song_id); // Prevent inserting the same song twice in this loop
  }
}

// Auto-advance queue when current song finishes
export async function advanceQueue(): Promise<void> {
  // Ensure we have upcoming songs before we try to advance
  await fillQueueFromPlaylist();

  const items = await getQueueItems();
  const playing = items.find(i => i.isPlaying);
  const upNext = items.filter(i => !i.isPlaying).sort((a, b) => a.position - b.position)[0];

  if (playing) {
    await removeQueueItem(playing.id);
  }

  if (upNext) {
    await setNowPlaying(upNext.id);
    publish(EventType.SONG_FINISHED, { finishedId: playing?.id ?? null, nextId: upNext.id }).catch(err =>
      console.error('[db] publish SONG_FINISHED failed:', err)
    );
  } else {
    publish(EventType.SONG_FINISHED, { finishedId: playing?.id ?? null, nextId: null }).catch(err => console.error('[db] publish SONG_FINISHED failed:', err));
  }
}

// ── Session Profile ───────────────────────────────────────────

export type SessionProfile = {
  sessionId: string;
  tokenBalance: number;
};

export async function getSessionProfile(sessionId: string): Promise<SessionProfile> {
  const tokenBalance = await getOrCreateTokenBalance(sessionId);
  return { sessionId, tokenBalance };
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

// ── Queue / Playlist Helpers ──────────────────────────────────

// Clear all queue items for the venue (used before re-importing a new playlist)
export async function clearQueueItems(): Promise<void> {
  await supabase.from('queue_items').delete().eq('venue_id', DEFAULT_VENUE_ID);
}

// Get the venue's current active_playlist_id
export async function getActivePlaylistId(): Promise<string | null> {
  const { data } = await supabase.from('venues').select('active_playlist_id').eq('id', DEFAULT_VENUE_ID).single();
  return data?.active_playlist_id ?? null;
}

// Remove an imported playlist and its playlist_songs from the DB
export async function removeImportedPlaylist(playlistId: string): Promise<void> {
  // Delete playlist_songs join records
  await supabase.from('playlist_songs').delete().eq('playlist_id', playlistId);
  // Delete the playlist record
  await supabase.from('playlists').delete().eq('id', playlistId);

  // If this was the active playlist, clear it on the venue and wipe the queue
  const { data: venue } = await supabase.from('venues').select('active_playlist_id').eq('id', DEFAULT_VENUE_ID).single();
  if (venue?.active_playlist_id === playlistId) {
    await supabase.from('venues').update({ active_playlist_id: null }).eq('id', DEFAULT_VENUE_ID);
    await clearQueueItems();
  }
}
