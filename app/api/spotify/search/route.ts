import { NextRequest, NextResponse } from 'next/server';

import { getClientCredentialsToken } from '@/lib/spotify-auth';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q?.trim()) return NextResponse.json([]);

  try {
    const token = await getClientCredentialsToken();
    const params = new URLSearchParams({ q, type: 'track', limit: '10' });
    const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return NextResponse.json({ error: errBody }, { status: res.status });
    }

    const data = await res.json();
    type RawTrack = { id: string; name: string; artists: { name: string }[]; album: { name: string; images: { url: string }[] }; duration_ms: number };
    const tracks = (data?.tracks?.items ?? []).map((t: RawTrack) => ({
      spotifyTrackId: t.id,
      title: t.name,
      artist: t.artists.map(a => a.name).join(', '),
      album: t.album?.name ?? '',
      albumArt: t.album?.images?.[0]?.url ?? null,
      durationMs: t.duration_ms ?? 0,
    }));
    return NextResponse.json(tracks);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
