import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('pmj_admin')?.value;
  const expected = Buffer.from(
    `${process.env.ADMIN_USERNAME ?? ''}:${process.env.ADMIN_PASSWORD ?? ''}`
  ).toString('base64');

  if (!token || token !== expected) {
    redirect('/admin');
  }

  return <>{children}</>;
}
