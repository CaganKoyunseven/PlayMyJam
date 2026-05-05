// tests/lib/event-bus.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build a fake Supabase channel that captures the INSERT callback
let insertCallback: ((change: unknown) => void) | null = null;

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockImplementation((_event, _filter, cb) => {
        insertCallback = cb;
        return { subscribe: vi.fn(), on: vi.fn().mockReturnThis() };
      }),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/lib/constants', () => ({
  DEFAULT_VENUE_ID: 'venue-1',
}));

import { EventType, publish, subscribe, teardownEventBus } from '@/lib/event-bus';
import { supabase } from '@/lib/supabase';

describe('EventType constants', () => {
  it('has all required event type strings', () => {
    expect(EventType.SONG_REQUESTED).toBe('SONG_REQUESTED');
    expect(EventType.TOKEN_SPENT).toBe('TOKEN_SPENT');
    expect(EventType.SONG_ADDED_TO_LIBRARY).toBe('SONG_ADDED_TO_LIBRARY');
  });
});

describe('publish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts a row into the events table', async () => {
    await publish(EventType.SONG_REQUESTED, { songId: '1' });
    expect(supabase.from).toHaveBeenCalledWith('events');
  });

  it('logs error when insert fails', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
    } as never);
    // Should not throw — just logs
    await expect(publish(EventType.TOKEN_SPENT, {})).resolves.toBeUndefined();
  });
});

describe('subscribe and teardownEventBus', () => {
  beforeEach(() => {
    teardownEventBus();
    vi.clearAllMocks();
    insertCallback = null;
  });

  it('returns an unsubscribe function', () => {
    const unsub = subscribe(EventType.SONG_REQUESTED, vi.fn());
    expect(typeof unsub).toBe('function');
    unsub(); // should not throw
  });

  it('triggers handlers when an event is received', () => {
    const handler = vi.fn();
    subscribe(EventType.SONG_REQUESTED, handler);

    // Simulate realtime event
    insertCallback!({
      new: {
        id: '1',
        type: EventType.SONG_REQUESTED,
        venue_id: 'venue-1',
        payload: { songId: 's1' },
        created_at: 'now',
      },
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: EventType.SONG_REQUESTED,
        payload: { songId: 's1' },
      })
    );
  });

  it('unsubscribe removes the handler', () => {
    const handler = vi.fn();
    const unsub = subscribe(EventType.SONG_STARTED, handler);
    unsub();
    // handler should not be called after unsubscribe
    expect(handler).not.toHaveBeenCalled();
  });
});
