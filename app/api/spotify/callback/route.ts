import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/spotify-auth';
import { supabase } from '@/lib/supabase';
import { DEFAULT_VENUE_ID } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL(`/queue?spotify_error=${error ?? 'no_code'}`, req.url));
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

    return NextResponse.redirect(new URL('/queue?spotify_connected=1', req.url));
  } catch (e) {
    console.error('Spotify callback error:', e);
    return NextResponse.redirect(new URL('/queue?spotify_error=callback_failed', req.url));
  }
}
