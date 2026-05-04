import { DEFAULT_VENUE_ID } from './constants';
import { supabase } from './supabase';

// ── Event Types ───────────────────────────────────────────────

export const EventType = {
  SONG_REQUESTED: 'SONG_REQUESTED',
  SONG_APPROVED: 'SONG_APPROVED',
  SONG_REJECTED: 'SONG_REJECTED',
  SONG_ADDED_TO_QUEUE: 'SONG_ADDED_TO_QUEUE',
  SONG_STARTED: 'SONG_STARTED',
  SONG_FINISHED: 'SONG_FINISHED',
  TOKEN_SPENT: 'TOKEN_SPENT',
  TOKEN_PURCHASED: 'TOKEN_PURCHASED',
  QUEUE_REORDERED: 'QUEUE_REORDERED',
  SONG_ADDED_TO_LIBRARY: 'SONG_ADDED_TO_LIBRARY',
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

export type AppEvent<T extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  type: EventType;
  venueId: string;
  payload: T;
  createdAt: string;
};

// ── Publish ───────────────────────────────────────────────────

export async function publish<T extends Record<string, unknown>>(type: EventType, payload: T, venueId = DEFAULT_VENUE_ID): Promise<void> {
  const { error } = await supabase.from('events').insert({
    type,
    venue_id: venueId,
    payload,
  });
  if (error) console.error(`[EventBus] publish failed (${type}):`, error.message);
}

// ── Subscribe (Realtime) ──────────────────────────────────────

type Handler<T extends Record<string, unknown> = Record<string, unknown>> = (event: AppEvent<T>) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const listeners = new Map<EventType, Set<Handler<any>>>();

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export function subscribe<T extends Record<string, unknown>>(type: EventType, handler: Handler<T>): () => void {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type)!.add(handler);
  ensureRealtimeChannel();
  return () => listeners.get(type)?.delete(handler);
}

function ensureRealtimeChannel() {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('events_bus')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'events',
        filter: `venue_id=eq.${DEFAULT_VENUE_ID}`,
      },
      change => {
        type EventRow = { id: string; type: string; venue_id: string; payload: Record<string, unknown>; created_at: string };
        const row = change.new as EventRow;
        const appEvent: AppEvent = {
          id: row.id,
          type: row.type as EventType,
          venueId: row.venue_id,
          payload: row.payload,
          createdAt: row.created_at,
        };
        const handlers = listeners.get(appEvent.type);
        handlers?.forEach(h => h(appEvent));
      }
    )
    .subscribe();
}

export function teardownEventBus() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  listeners.clear();
}
