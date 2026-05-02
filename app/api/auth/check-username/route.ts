import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username') ?? '';
  if (!username || username.length < 3) {
    return NextResponse.json({ available: false });
  }

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  return NextResponse.json({ available: data === null });
}
