import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin/dashboard')) {
    const token = request.cookies.get('pmj_admin')?.value;
    const adminUser = process.env.ADMIN_USERNAME ?? '';
    const adminPass = process.env.ADMIN_PASSWORD ?? '';
    const expected = btoa(`${adminUser}:${adminPass}`);

    if (!token || token !== expected) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/dashboard/:path*'],
};
