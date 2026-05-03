import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { buildAdminToken } from '@/lib/admin-auth';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const username = process.env.ADMIN_USERNAME ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';
  const cookieStore = await cookies();
  const token = cookieStore.get('pmj_admin')?.value;
  if (!username || !password || !token || token !== buildAdminToken(username, password)) {
    redirect('/admin');
  }
  return <>{children}</>;
}
