import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { buildAdminToken } from '@/lib/admin-auth';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const username = process.env.ADMIN_USERNAME ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';
  const cookieStore = await cookies();
  const token = cookieStore.get('pmj_admin')?.value;
  const expected = (username && password) ? buildAdminToken(username, password) : '';
  console.error('[layout] auth check', {
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
  if (!username || !password || !token || token !== expected) redirect('/admin');
  return <>{children}</>;
}
