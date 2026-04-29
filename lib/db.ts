import { supabase } from './supabase';
import { DEFAULT_VENUE_ID } from './constants';

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
