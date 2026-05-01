import { subscribe, EventType } from '../event-bus';
import { insertQueueItem } from '../db';

export function initQueueObserver(): () => void {
  return subscribe<{ songId: string }>(
    EventType.SONG_APPROVED,
    async (event) => {
      await insertQueueItem(event.payload.songId);
    }
  );
}
