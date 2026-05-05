// tests/api/spotify/search.test.ts
import { NextRequest } from 'next/server';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/spotify-auth', () => ({
  getClientCredentialsToken: vi.fn().mockResolvedValue('mock-cc-token'),
}));

import { GET } from '@/app/api/spotify/search/route';

function makeRequest(q?: string) {
  const url = q ? `http://localhost/api/spotify/search?q=${encodeURIComponent(q)}` : 'http://localhost/api/spotify/search';
  return new NextRequest(url);
}

const RAW_TRACKS = [
  {
    id: 'track1',
    name: 'Song One',
    artists: [{ name: 'Artist A' }],
    album: { name: 'Album A', images: [{ url: 'http://art.jpg' }] },
    duration_ms: 200000,
  },
];

describe('GET /api/spotify/search', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns empty array when q is missing', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns empty array when q is whitespace', async () => {
    const res = await GET(makeRequest('   '));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns mapped tracks from Spotify on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tracks: { items: RAW_TRACKS } }),
      })
    );
    const res = await GET(makeRequest('song one'));
    expect(res.status).toBe(200);
    const tracks = await res.json();
    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toEqual({
      spotifyTrackId: 'track1',
      title: 'Song One',
      artist: 'Artist A',
      album: 'Album A',
      albumArt: 'http://art.jpg',
      durationMs: 200000,
    });
  });

  it('forwards Spotify error status when API returns non-ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'Forbidden' } }),
      })
    );
    const res = await GET(makeRequest('test'));
    expect(res.status).toBe(403);
  });

  it('returns 500 when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const res = await GET(makeRequest('test'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Network error');
  });
});
