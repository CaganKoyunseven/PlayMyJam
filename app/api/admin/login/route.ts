import { NextRequest, NextResponse } from 'next/server';

import { buildAdminToken } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPass) {
    return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
  }

  if (username !== adminUser || password !== adminPass) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = buildAdminToken(adminUser, adminPass);
  const res = NextResponse.json({ ok: true });
  res.cookies.set('pmj_admin', token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
  return res;
}
