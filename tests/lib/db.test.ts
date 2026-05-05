// tests/lib/db.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

vi.mock('@/lib/constants', () => ({
  DEFAULT_VENUE_ID: 'venue-1',
}));

vi.mock('@/lib/event-bus', () => ({
  publish: vi.fn().mockResolvedValue(undefined),
  EventType: {
    SONG_ADDED_TO_QUEUE: 'SONG_ADDED_TO_QUEUE',
    SONG_STARTED: 'SONG_STARTED',
    SONG_FINISHED: 'SONG_FINISHED',
    TOKEN_SPENT: 'TOKEN_SPENT',
    SONG_ADDED_TO_LIBRARY: 'SONG_ADDED_TO_LIBRARY',
    SONG_REJECTED: 'SONG_REJECTED',
    SONG_REQUESTED: 'SONG_REQUESTED',
  },
}));

import { supabase } from '@/lib/supabase';
import { 
  getQueueItems, removeQueueItem, insertQueueEntry, getQueueEntries,
  insertQueueItem, updateQueueItemPosition, setNowPlaying,
  getPendingRequests, approveRequest, rejectRequest, createSongRequest,
  insertSongRequest, getOrCreateTokenBalance, deductToken,
  getVenueImportedPlaylists, getPlaylistSongs, advanceQueue,
  getSessionProfile, getUserProfile
} from '@/lib/db';
import { publish } from '@/lib/event-bus';

function mockChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'in', 'order', 'single', 'maybeSingle'].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  (chain as { single: ReturnType<typeof vi.fn> }).single = vi.fn().mockResolvedValue(resolvedValue);
  (chain as { maybeSingle: ReturnType<typeof vi.fn> }).maybeSingle = vi.fn().mockResolvedValue(resolvedValue);
  (chain as { order: ReturnType<typeof vi.fn> }).order = vi.fn().mockResolvedValue(resolvedValue);
  (chain as { delete: ReturnType<typeof vi.fn> }).delete = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  return chain;
}

describe('DB Queue & Items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getQueueItems returns empty array when no rows', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockChain({ data: null, error: null }) as never);
    const items = await getQueueItems();
    expect(items).toEqual([]);
  });

  it('maps row fields to QueueItem shape', async () => {
    const rows = [{
      id: 'item-1',
      song_id: 'song-1',
      position: 0,
      is_playing: false,
      songs: { title: 'My Song', artist: 'Artist', album_art: 'http://art', duration_ms: 180000 },
    }];
    vi.mocked(supabase.from).mockReturnValue(mockChain({ data: rows, error: null }) as never);
    const items = await getQueueItems();
    expect(items[0]).toMatchObject({ id: 'item-1', songId: 'song-1', title: 'My Song' });
  });

  it('removeQueueItem calls delete with the given id', async () => {
    const mockFrom = mockChain({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue(mockFrom as never);
    await removeQueueItem('item-99');
    expect(supabase.from).toHaveBeenCalledWith('queue_items');
  });

  it('insertQueueEntry inserts entry', async () => {
    const mockFrom = mockChain({ error: null });
    vi.mocked(supabase.from).mockReturnValue(mockFrom as never);
    await insertQueueEntry({ spotifyTrackId: '123', trackTitle: 'Title', trackArtist: 'Art' });
    expect(supabase.from).toHaveBeenCalledWith('queue_entries');
  });

  it('getQueueEntries returns entries', async () => {
    const mockFrom = mockChain({ data: [{ spotify_track_id: '1', track_title: 'Title', wait_minutes: 5, tokens_spent: 1 }] });
    vi.mocked(supabase.from).mockReturnValue(mockFrom as never);
    const entries = await getQueueEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('Title');
  });

  it('insertQueueItem publishes event', async () => {
    const mockFrom = mockChain({ error: null });
    vi.mocked(supabase.from).mockReturnValue(mockFrom as never);
    await insertQueueItem('song-1', 1);
    expect(publish).toHaveBeenCalled();
  });

  it('updateQueueItemPosition updates DB', async () => {
    const mockFrom = mockChain({ error: null });
    vi.mocked(supabase.from).mockReturnValue(mockFrom as never);
    await updateQueueItemPosition('item-1', 2);
    expect(supabase.from).toHaveBeenCalledWith('queue_items');
  });

  it('setNowPlaying updates DB and publishes', async () => {
    const mockFrom = mockChain({ error: null });
    vi.mocked(supabase.from).mockReturnValue(mockFrom as never);
    await setNowPlaying('item-1');
    expect(publish).toHaveBeenCalled();
  });
});

describe('Song Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getPendingRequests returns mapped requests', async () => {
    const rows = [{
      id: 'req-1', song_id: 'song-1', session_id: 'sess-1', requested_at: '2023',
      songs: { title: 'Song', artist: 'Artist', album_art: 'Art' }
    }];
    vi.mocked(supabase.from).mockReturnValue(mockChain({ data: rows, error: null }) as never);
    const reqs = await getPendingRequests();
    expect(reqs[0].title).toBe('Song');
  });

  it('approveRequest updates status and publishes', async () => {
    const mockFrom = mockChain({ data: { title: 'T', artist: 'A' }, error: null });
    // Handle playlists fetch returning empty to avoid upsert issues
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'playlists') return mockChain({ data: [] }) as never;
      return mockFrom as never;
    });
    
    await approveRequest('req-1', 'song-1', 'sess-1');
    expect(publish).toHaveBeenCalled();
  });

  it('rejectRequest updates status and publishes', async () => {
    const mockFrom = mockChain({ error: null });
    vi.mocked(supabase.from).mockReturnValue(mockFrom as never);
    await rejectRequest('req-1');
    expect(publish).toHaveBeenCalled();
  });

  it('createSongRequest handles success', async () => {
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { upsert: vi.fn().mockResolvedValue({ error: null }) } as never;
      if (callCount === 2) return mockChain({ data: { id: 'song-1' } }) as never;
      if (callCount === 3) return mockChain({ data: null }) as never; // No existing request
      if (callCount === 4) return { insert: vi.fn().mockResolvedValue({ error: null }) } as never;
      return mockChain({}) as never;
    });

    const res = await createSongRequest({ spotifyTrackId: '1', title: 'T', artist: 'A', album: '', albumArt: null, durationMs: 0 }, 'sess-1');
    expect(res.ok).toBe(true);
    expect(publish).toHaveBeenCalled();
  });

  it('insertSongRequest inserts legacy request', async () => {
    const mockFrom = mockChain({ error: null });
    vi.mocked(supabase.from).mockReturnValue(mockFrom as never);
    await insertSongRequest('song-1', 'sess-1');
    expect(supabase.from).toHaveBeenCalledWith('song_requests');
  });
});

describe('Token Balances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getOrCreateTokenBalance gets balance', async () => {
    const mockFrom = mockChain({ data: { balance: 5 }, error: null });
    vi.mocked(supabase.from).mockReturnValue(mockFrom as never);
    const b = await getOrCreateTokenBalance('sess-1');
    expect(b).toBe(5);
  });

  it('deductToken reduces balance and publishes', async () => {
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockChain({ data: { balance: 2 } }) as never; // current
      if (callCount === 2) {
        const chain = mockChain({});
        chain.select = vi.fn().mockResolvedValue({ data: [{ balance: 1 }] });
        return chain as never;
      }
      return mockChain({}) as never;
    });

    const res = await deductToken('sess-1');
    expect(res.ok).toBe(true);
    expect(res.balance).toBe(1);
    expect(publish).toHaveBeenCalled();
  });
});

describe('Playlists', () => {
  it('getVenueImportedPlaylists returns mapped lists', async () => {
    const mockFrom = mockChain({ data: [{ id: 'p1', spotify_playlist_id: 'sp1', name: 'N', track_count: 5 }] });
    vi.mocked(supabase.from).mockReturnValue(mockFrom as never);
    const p = await getVenueImportedPlaylists();
    expect(p).toHaveLength(1);
  });

  it('getPlaylistSongs returns mapped songs', async () => {
    const mockFrom = mockChain({ data: [{ position: 0, songs: { id: 's1', title: 'T', artist: 'A', duration_ms: 10 } }] });
    vi.mocked(supabase.from).mockReturnValue(mockFrom as never);
    const p = await getPlaylistSongs('p1');
    expect(p).toHaveLength(1);
  });

  it('advanceQueue works with playing song', async () => {
    const items = [
      { id: 'item-1', isPlaying: true, position: 1 },
      { id: 'item-2', isPlaying: false, position: 2 }
    ];
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'queue_items') {
        const chain = mockChain({ data: items });
        // Make delete work
        (chain as any).delete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
        // Make update work
        (chain as any).update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
        return chain as never;
      }
      return mockChain({}) as never;
    });

    await advanceQueue();
    expect(publish).toHaveBeenCalled();
  });
});

describe('Profiles', () => {
  it('getSessionProfile gets profile', async () => {
    const mockFrom = mockChain({ data: { balance: 10 } });
    vi.mocked(supabase.from).mockReturnValue(mockFrom as never);
    const p = await getSessionProfile('sess-1');
    expect(p.tokenBalance).toBe(10);
  });

  it('getUserProfile gets user data', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'user-1' } } } as never);
    const mockFrom = mockChain({ data: { id: 'user-1', created_at: '2023-01-01' } });
    vi.mocked(supabase.from).mockReturnValue(mockFrom as never);
    const p = await getUserProfile();
    expect(p?.id).toBe('user-1');
  });
});
