import { NextResponse } from 'next/server';
import { getSpotifyAuthUrl } from '@/lib/spotify-auth';

export async function GET() {
  return NextResponse.redirect(getSpotifyAuthUrl());
}
