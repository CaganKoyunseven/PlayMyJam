import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  findTracksInObject,
  checkSpotifyConnection,
  getVenuePlaylists,
  searchTracks,
  startPlayback,
  playTrack,
  pausePlayback,
  resumePlayback,
  skipToNext,
  getCurrentlyPlaying,
  importPlaylist,
} from '@/lib/spotify-api';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'p1', spotify_access_token: 'mock-token' }, error: null }),
    }),
  },
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'p1' }, error: null }),
    }),
  },
}));

vi.mock('@/lib/spotify-auth', () => ({
  getClientCredentialsToken: vi.fn().mockResolvedValue('cc-token'),
  getVenueToken: vi.fn().mockResolvedValue('venue-token'),
}));

const VALID_ID = 'a'.repeat(22); // 22-char base-62 string

function makeTrack(id = VALID_ID, name = 'Test Track', artists = [{ name: 'Artist' }]) {
  return { id, name, artists, duration_ms: 210000, album: { name: 'Album', images: [{ url: 'http://img' }] } };
}

describe('findTracksInObject', () => {
  it('returns empty array for null input', () => {
    expect(findTracksInObject(null, 5)).toEqual([]);
  });

  it('returns empty array for primitive input', () => {
    expect(findTracksInObject('string', 5)).toEqual([]);
    expect(findTracksInObject(42, 5)).toEqual([]);
  });

  it('finds a track at top level', () => {
    const track = makeTrack();
    const results = findTracksInObject(track, 5);
    expect(results).toHaveLength(1);
    expect(results[0].spotifyTrackId).toBe(VALID_ID);
    expect(results[0].title).toBe('Test Track');
    expect(results[0].artist).toBe('Artist');
  });

  it('finds tracks nested inside an object', () => {
    const data = { playlist: { items: [{ track: makeTrack() }] } };
    const results = findTracksInObject(data, 10);
    expect(results).toHaveLength(1);
  });

  it('finds tracks nested inside an array', () => {
    const data = [makeTrack('a'.repeat(22)), makeTrack('b'.repeat(22))];
    const results = findTracksInObject(data, 5);
    expect(results).toHaveLength(2);
  });

  it('deduplicates tracks with the same id', () => {
    const track = makeTrack();
    const data = { a: track, b: { c: track } };
    const results = findTracksInObject(data, 10);
    expect(results).toHaveLength(1);
  });

  it('ignores objects with id that is not 22 chars', () => {
    const short = { id: 'short', name: 'Bad', artists: [{ name: 'X' }], duration_ms: 0 };
    expect(findTracksInObject(short, 5)).toHaveLength(0);
  });

  it('respects maxDepth — does not traverse past limit', () => {
    const deep = { l1: { l2: { l3: { l4: { l5: { l6: makeTrack() } } } } } };
    expect(findTracksInObject(deep, 4)).toHaveLength(0);
    expect(findTracksInObject(deep, 10)).toHaveLength(1);
  });

  it('extracts album art from album.images[0].url', () => {
    const track = makeTrack();
    const [result] = findTracksInObject(track, 5);
    expect(result.albumArt).toBe('http://img');
  });

  it('returns null albumArt when album has no images', () => {
    const track = { ...makeTrack(), album: { name: 'Album', images: [] } };
    const [result] = findTracksInObject(track, 5);
    expect(result.albumArt).toBeNull();
  });

  it('joins multiple artist names with comma', () => {
    const track = makeTrack(VALID_ID, 'Song', [{ name: 'A' }, { name: 'B' }]);
    const [result] = findTracksInObject(track, 5);
    expect(result.artist).toBe('A, B');
  });
});

describe('Spotify API Fetch Wrappers', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('checkSpotifyConnection returns true if token exists', async () => {
    const res = await checkSpotifyConnection();
    expect(res.connected).toBe(true);
  });

  it('getVenuePlaylists fetches playlists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [{ id: 'p1', name: 'Playlist 1', images: [{ url: 'img' }], tracks: { total: 10 } }],
        }),
      })
    );
    const p = await getVenuePlaylists();
    expect(p).toHaveLength(1);
    expect(p[0].id).toBe('p1');
  });

  it('searchTracks calls API route', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ spotifyTrackId: 't1' }],
      })
    );
    const res = await searchTracks('test');
    expect(res).toHaveLength(1);
  });

  it('startPlayback calls PUT /me/player/play', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', mockFetch);
    await startPlayback('dev1', 'uri:1');
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/me/player/play?device_id=dev1'), expect.objectContaining({ method: 'PUT' }));
  });

  it('playTrack calls PUT /me/player/play with uris', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', mockFetch);
    await playTrack('dev1', 'uri:track');
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/me/player/play?device_id=dev1'), expect.objectContaining({ method: 'PUT' }));
  });

  it('pausePlayback calls PUT /me/player/pause', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', mockFetch);
    await pausePlayback();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/me/player/pause'), expect.objectContaining({ method: 'PUT' }));
  });

  it('resumePlayback calls PUT /me/player/play', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', mockFetch);
    await resumePlayback();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/me/player/play'), expect.objectContaining({ method: 'PUT' }));
  });

  it('skipToNext calls POST /me/player/next', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', mockFetch);
    await skipToNext();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/me/player/next'), expect.objectContaining({ method: 'POST' }));
  });

  it('getCurrentlyPlaying calls GET /me/player/currently-playing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ is_playing: true }) });
    vi.stubGlobal('fetch', mockFetch);
    const res = await getCurrentlyPlaying();
    expect(res.is_playing).toBe(true);
  });

  it('returns mock playlists on API error instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    const p = await getVenuePlaylists();
    expect(p).toHaveLength(2);
    expect(p[0].id).toBe('MOCK_PLAYLIST_1');
  });

  it('importPlaylist uses API to fetch tracks', async () => {
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Meta
          return Promise.resolve({ ok: true, json: async () => ({ name: 'P', images: [] }) });
        }
        if (callCount === 2) {
          // Tracks
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [{ track: { id: VALID_ID, name: 'T', artists: [{ name: 'A' }] } }],
              next: null,
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      })
    );

    const res = await importPlaylist('p1');
    expect(res.imported).toBe(1);
    expect(res.playlistId).toBe('p1');
  });

  it('importPlaylist falls back to scraping if API returns 0 tracks', async () => {
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Meta
          return Promise.resolve({ ok: true, json: async () => ({ name: 'P', images: [] }) });
        }
        if (callCount === 2) {
          // API tracks fails or 0
          return Promise.resolve({ ok: true, json: async () => ({ items: [], next: null }) });
        }
        if (callCount === 3) {
          // Scrape page
          return Promise.resolve({
            ok: true,
            text: async () => `<script id="__NEXT_DATA__">${JSON.stringify({ playlist: { items: [{ track: makeTrack() }] } })}</script>`,
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      })
    );

    const res = await importPlaylist('p1');
    expect(res.imported).toBe(1);
  });

  it('importPlaylist falls back to mock data if all sources fail', async () => {
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Meta
          return Promise.resolve({ ok: true, json: async () => ({ name: 'P', images: [] }) });
        }
        if (callCount === 2) {
          // API tracks fails or 0
          return Promise.resolve({ ok: true, json: async () => ({ items: [], next: null }) });
        }
        if (callCount === 3) {
          // Scrape page fails
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      })
    );

    const res = await importPlaylist('p1');
    expect(res.imported).toBeGreaterThan(0);
  });

  it('importPlaylist fetches missing metadata', async () => {
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Meta
          return Promise.resolve({ ok: true, json: async () => ({ name: 'P', images: [] }) });
        }
        if (callCount === 2) {
          // API tracks fails
          return Promise.resolve({ ok: true, json: async () => ({ items: [], next: null }) });
        }
        if (callCount === 3) {
          // Scrape page gets IDs only
          return Promise.resolve({
            ok: true,
            text: async () => `<html><a href="/track/${VALID_ID}">Link</a></html>`,
          });
        }
        if (callCount > 3) {
          // Individual track fetch
          return Promise.resolve({
            ok: true,
            text: async () => '<title>Fetched Track - song by The Artist | Spotify</title>',
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      })
    );

    const res = await importPlaylist('p1');
    expect(res.imported).toBe(1);
  });
});
