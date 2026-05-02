import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { login } = (await req.json()) as { login: string };

  if (!login) {
    return NextResponse.json({ error: 'Login required' }, { status: 400 });
  }

  if (login.includes('@')) {
    return NextResponse.json({ email: login });
  }

  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('username', login)
    .maybeSingle();

  if (!data?.email) {
    return NextResponse.json({ error: 'Username not found' }, { status: 404 });
  }

  return NextResponse.json({ email: data.email });
}
