import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Web Crypto API — same HMAC-SHA256 as lib/admin-auth.ts but works in Edge runtime
async function verifyAdminCookie(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('pmj_admin')?.value;
  if (!token) return false;
  const username = process.env.ADMIN_USERNAME ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (!username || !password) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`pmj:${username}`));
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return token === expected;
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin/dashboard')) {
    if (!(await verifyAdminCookie(request))) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/dashboard', '/admin/dashboard/:path*'],
};
