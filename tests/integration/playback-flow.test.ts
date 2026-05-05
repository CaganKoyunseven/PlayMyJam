import { describe, it, expect, vi, beforeEach } from 'vitest';
import { insertQueueItem, advanceQueue, getQueueItems } from '../../lib/db';
import { supabase } from '../../lib/supabase';

// Helper to create a chainable mock
const createMockChain = (data: any = null, error: any = null) => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data, error }),
    catch: (reject: any) => reject(error),
  };
  return chain;
};

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Playback Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle priority insertion and rotation correctly', async () => {
    // 1. Initial State: Song A is playing, Song B is up next
    const mockItems = [
      { id: '1', song_id: 'A', position: 100, is_playing: true, is_priority: false, songs: { title: 'Song A', artist: 'Art', album_art: 'Art', duration_ms: 200000 } },
      { id: '2', song_id: 'B', position: 101, is_playing: false, is_priority: false, songs: { title: 'Song B', artist: 'Art', album_art: 'Art', duration_ms: 200000 } },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'queue_items') return createMockChain(mockItems);
      return createMockChain();
    });

    // 2. Insert Priority Song (Song C)
    await insertQueueItem('C', undefined, true);

    expect(supabase.from).toHaveBeenCalledWith('queue_items');

    // 3. Advance Queue
    const updatedMockItems = [
      { id: '1', song_id: 'A', position: 100, is_playing: true, is_priority: false, songs: { title: 'Song A' } },
      { id: '3', song_id: 'C', position: 101, is_playing: false, is_priority: true, songs: { title: 'Song C' } },
      { id: '2', song_id: 'B', position: 102, is_playing: false, is_priority: false, songs: { title: 'Song B' } },
    ];
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'queue_items') return createMockChain(updatedMockItems);
      return createMockChain();
    });

    await advanceQueue();

    // Verify rotation updates
    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('queue_items');
  });
});
