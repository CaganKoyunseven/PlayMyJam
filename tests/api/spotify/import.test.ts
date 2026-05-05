// tests/api/spotify/import.test.ts
import { NextRequest } from 'next/server';

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/admin-auth', () => ({
  isAdminAuthed: vi.fn(),
}));

vi.mock('@/lib/spotify-api', () => ({
  importPlaylist: vi.fn(),
}));

import { POST } from '@/app/api/spotify/import/route';
import { isAdminAuthed } from '@/lib/admin-auth';
import { importPlaylist } from '@/lib/spotify-api';

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/spotify/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/spotify/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(isAdminAuthed).mockResolvedValue(false);
    const res = await POST(makeRequest({ playlistId: 'abc123' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing playlistId', async () => {
    vi.mocked(isAdminAuthed).mockResolvedValue(true);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 for playlistId with non-alphanumeric chars', async () => {
    vi.mocked(isAdminAuthed).mockResolvedValue(true);
    const res = await POST(makeRequest({ playlistId: 'abc/../../etc' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for playlistId with spaces', async () => {
    vi.mocked(isAdminAuthed).mockResolvedValue(true);
    const res = await POST(makeRequest({ playlistId: 'abc 123' }));
    expect(res.status).toBe(400);
  });

  it('calls importPlaylist and returns result on success', async () => {
    vi.mocked(isAdminAuthed).mockResolvedValue(true);
    vi.mocked(importPlaylist).mockResolvedValue({ playlistId: 'pl-1', imported: 10 });
    const res = await POST(makeRequest({ playlistId: 'validBase62ID123456' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ playlistId: 'pl-1', imported: 10 });
    expect(importPlaylist).toHaveBeenCalledWith('validBase62ID123456');
  });

  it('returns 500 when importPlaylist throws', async () => {
    vi.mocked(isAdminAuthed).mockResolvedValue(true);
    vi.mocked(importPlaylist).mockRejectedValue(new Error('Forbidden'));
    const res = await POST(makeRequest({ playlistId: 'validBase62ID123456' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });
});
