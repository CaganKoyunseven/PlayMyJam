import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let login: string;
  try {
    const body = await req.json();
    login = body.login ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!login) {
    return NextResponse.json({ error: 'Login required' }, { status: 400 });
  }

  if (EMAIL_RE.test(login)) {
    return NextResponse.json({ email: login });
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', login)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Username not found' }, { status: 404 });
    }

    if (!data.email) {
      return NextResponse.json({ error: 'Account has no email on record' }, { status: 404 });
    }

    return NextResponse.json({ email: data.email });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
