import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let login: string;
  let password: string;
  try {
    const body = await req.json();
    login = body.login ?? '';
    password = body.password ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!login || !password) {
    return NextResponse.json({ error: 'Login and password required' }, { status: 400 });
  }

  // Resolve username → email server-side (email never returned to client)
  let email = login;
  if (!EMAIL_RE.test(login)) {
    try {
      const { data, error } = await supabase.from('profiles').select('email').eq('username', login).maybeSingle();
      if (error || !data?.email) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      email = data.email;
    } catch {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  }

  // Authenticate server-side — session tokens returned, email never exposed
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  return NextResponse.json({
    session: {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    },
  });
}
