import { NextRequest, NextResponse } from 'next/server';
import { getClientCredentialsToken } from '@/lib/spotify-auth';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q?.trim()) return NextResponse.json([]);

  try {
    const token = await getClientCredentialsToken();
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return NextResponse.json([], { status: res.status });

    const data = await res.json();
    const tracks = (data?.tracks?.items ?? []).map((t: any) => ({
      spotifyTrackId: t.id,
      title: t.name,
      artist: t.artists.map((a: any) => a.name).join(', '),
      album: t.album?.name ?? '',
      albumArt: t.album?.images?.[0]?.url ?? null,
      durationMs: t.duration_ms ?? 0,
    }));
    return NextResponse.json(tracks);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
