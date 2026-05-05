import { DEFAULT_VENUE_ID } from './constants';
import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const REDIRECT_URI = (process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/spotify/callback').trim();

const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

// ── Client Credentials (public data, no user login) ──────────

let ccToken: string | null = null;
let ccExpiry = 0;

export async function getClientCredentialsToken(): Promise<string> {
  if (ccToken && Date.now() < ccExpiry) return ccToken;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error(`Spotify CC token failed: ${res.status}`);

  const data = await res.json();
  ccToken = data.access_token;
  ccExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return ccToken!;
}

// ── Authorization Code Flow (venue owner login) ───────────────

export function getSpotifyAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    show_dialog: 'true',
    state,
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

export async function refreshVenueToken(venueId: string): Promise<string> {
  const { data: venue } = await supabase.from('venues').select('spotify_refresh_token, spotify_token_expires_at').eq('id', venueId).single();

  if (!venue?.spotify_refresh_token) throw new Error('No refresh token for venue');

  const expiresAt = venue.spotify_token_expires_at ? new Date(venue.spotify_token_expires_at).getTime() : 0;

  if (Date.now() < expiresAt - 60_000) {
    const { data } = await supabase.from('venues').select('spotify_access_token').eq('id', venueId).single();
    return data!.spotify_access_token;
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: venue.spotify_refresh_token,
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);

  const tokens = await res.json();
  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabaseAdmin
    .from('venues')
    .update({
      spotify_access_token: tokens.access_token,
      spotify_token_expires_at: newExpiry,
      ...(tokens.refresh_token ? { spotify_refresh_token: tokens.refresh_token } : {}),
    })
    .eq('id', venueId);

  return tokens.access_token;
}

export async function getVenueToken(): Promise<string | null> {
  try {
    return await refreshVenueToken(DEFAULT_VENUE_ID);
  } catch {
    return null;
  }
}
