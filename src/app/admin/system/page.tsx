import { redirect } from 'next/navigation';
import { actor } from '@/lib/mvpServer';
import AdminSystemConsole from './AdminSystemConsole';

export const dynamic = 'force-dynamic';

export default async function SystemAdminPage() {
  const current = await actor();
  if (!current?.admin) redirect('/login');
  return <AdminSystemConsole />;
}
