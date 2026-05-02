import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username') ?? '';
  if (!username || username.length < 3) {
    return NextResponse.json({ available: false });
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Failed to check username' }, { status: 500 });
    }

    return NextResponse.json({ available: data === null });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
