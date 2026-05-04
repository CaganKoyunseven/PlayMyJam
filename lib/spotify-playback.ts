'use client';

// Spotify Web Playback SDK — requires Spotify Premium on the venue account.
// SDK is loaded dynamically via <script> in the component that uses this.

export type PlaybackState = {
  isPlaying: boolean;
  trackName: string;
  artistName: string;
  albumArt: string;
  progressMs: number;
  durationMs: number;
  deviceId: string | null;
};

export const defaultPlaybackState: PlaybackState = {
  isPlaying: false,
  trackName: '',
  artistName: '',
  albumArt: '',
  progressMs: 0,
  durationMs: 0,
  deviceId: null,
};

let player: Spotify.Player | null = null;

export function initSpotifyPlayer(
  getToken: () => Promise<string>,
  onStateChange: (state: PlaybackState) => void,
  onReady: (deviceId: string) => void,
  onError: (msg: string) => void,
  onTrackEnd?: () => void
): Promise<void> {
  return new Promise(resolve => {
    if (player) {
      resolve();
      return;
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      player = new window.Spotify.Player({
        name: 'PlayMyJam Venue Player',
        getOAuthToken: (cb: (token: string) => void) => {
          getToken()
            .then(cb)
            .catch(() => onError('Token fetch failed'));
        },
        volume: 0.8,
      });

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        onReady(device_id);
        resolve();
      });

      player.addListener('not_ready', () => onError('Player not ready'));

      let lastTrackId: string | null = null;

      player.addListener('player_state_changed', (state: Spotify.PlaybackState) => {
        if (!state) return;
        const track = state.track_window?.current_track;
        const currentTrackId = track?.id ?? null;

        // Track ended: paused at position 0 and we had a previous track playing
        if (state.paused && state.position === 0 && lastTrackId !== null && lastTrackId !== currentTrackId) {
          onTrackEnd?.();
        }

        lastTrackId = currentTrackId;

        onStateChange({
          isPlaying: !state.paused,
          trackName: track?.name ?? '',
          artistName: track?.artists?.[0]?.name ?? '',
          albumArt: track?.album?.images?.[0]?.url ?? '',
          progressMs: state.position,
          durationMs: state.duration,
          deviceId: null,
        });
      });

      player.addListener('initialization_error', ({ message }: Spotify.Error) => onError(message));
      player.addListener('authentication_error', ({ message }: Spotify.Error) => onError(message));
      player.addListener('account_error', () => onError('Spotify Premium required for playback'));

      player.connect();
    };

    if (window.Spotify) {
      window.onSpotifyWebPlaybackSDKReady();
    } else {
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

export function disconnectPlayer() {
  player?.disconnect();
  player = null;
}
