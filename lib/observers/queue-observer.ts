import { subscribe, publish, EventType } from '../event-bus';
import { insertQueueItem } from '../db';

export function initQueueObserver(): () => void {
  return subscribe<{ songId: string }>(
    EventType.SONG_APPROVED,
    async (event) => {
      await insertQueueItem(event.payload.songId);
      publish(EventType.SONG_ADDED_TO_QUEUE, { songId: event.payload.songId }).catch(
        (err) => console.error('[QueueObserver] publish failed:', err)
      );
    }
  );
}
