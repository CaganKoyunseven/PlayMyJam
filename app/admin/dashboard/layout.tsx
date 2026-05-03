import { redirect } from 'next/navigation';
import { isAdminAuthed } from '@/lib/admin-auth';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminAuthed())) redirect('/admin');
  return <>{children}</>;
}
