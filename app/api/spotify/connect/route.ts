import { randomBytes } from 'crypto';

import { NextResponse } from 'next/server';

import { isAdminAuthed } from '@/lib/admin-auth';
import { getSpotifyAuthUrl } from '@/lib/spotify-auth';

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.redirect(new URL('/admin', process.env.NEXTAUTH_URL ?? 'http://localhost:3000'));
  }

  const state = randomBytes(16).toString('hex');
  const response = NextResponse.redirect(getSpotifyAuthUrl(state));
  // sameSite: 'lax' — Spotify redirects back via top-level GET, strict would block the cookie
  response.cookies.set('spotify_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });
  return response;
}
