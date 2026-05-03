import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

// Standalone Next.js (Docker) runs middleware in Node.js — crypto module is available
function buildAdminToken(username: string, password: string): string {
  return createHmac('sha256', password).update(`pmj:${username}`).digest('hex');
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin/dashboard')) {
    const token = request.cookies.get('pmj_admin')?.value;
    const username = process.env.ADMIN_USERNAME ?? '';
    const password = process.env.ADMIN_PASSWORD ?? '';
    const expected = (username && password) ? buildAdminToken(username, password) : '';
    console.error('[proxy] auth check', {
      hasUsername: !!username,
      usernameLen: username.length,
      hasPassword: !!password,
      passwordLen: password.length,
      hasCookie: !!token,
      cookieLen: token?.length ?? 0,
      expectedPrefix: expected.slice(0, 8),
      cookiePrefix: token?.slice(0, 8) ?? '',
      match: !!token && token === expected,
    });
    if (!username || !password || !token || token !== expected) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/dashboard', '/admin/dashboard/:path*'],
};
