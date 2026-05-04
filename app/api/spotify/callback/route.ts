import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { DEFAULT_VENUE_ID } from '@/lib/constants';
import { exchangeCodeForTokens } from '@/lib/spotify-auth';
import { supabase } from '@/lib/supabase';

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;
  return process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const returnedState = req.nextUrl.searchParams.get('state');

  const base = getBaseUrl(req);

  // Validate OAuth state — prevents CSRF on the callback
  const cookieStore = await cookies();
  const savedState = cookieStore.get('spotify_oauth_state')?.value;
  if (!returnedState || !savedState || returnedState !== savedState) {
    return NextResponse.redirect(new URL('/admin/dashboard?spotify_error=invalid_state', base));
  }

  if (error || !code) {
    return NextResponse.redirect(new URL('/admin/dashboard?spotify_error=auth_failed', base));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await supabase
      .from('venues')
      .update({
        spotify_access_token: tokens.access_token,
        spotify_refresh_token: tokens.refresh_token,
        spotify_token_expires_at: expiresAt,
      })
      .eq('id', DEFAULT_VENUE_ID);

    return NextResponse.redirect(new URL('/admin/dashboard?spotify_connected=1', base));
  } catch (e) {
    console.error('Spotify callback error:', e);
    return NextResponse.redirect(new URL('/admin/dashboard?spotify_error=callback_failed', base));
  }
}
