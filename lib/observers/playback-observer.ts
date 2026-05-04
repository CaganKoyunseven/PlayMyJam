import { subscribe, EventType } from '../event-bus';
import { playTrack } from '../spotify-api';

export function initPlaybackObserver(): () => void {
  return subscribe<{ spotifyTrackUri: string; deviceId: string }>(EventType.SONG_STARTED, async event => {
    const { spotifyTrackUri, deviceId } = event.payload;
    if (!spotifyTrackUri || !deviceId) return;
    try {
      await playTrack(deviceId, spotifyTrackUri);
    } catch (err) {
      console.error('[PlaybackObserver] playTrack failed:', err);
    }
  });
}
