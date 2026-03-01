import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminDashboardClient } from './admin-client';

const MASTER_EMAILS = ['beyondworks.br@gmail.com'];

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    redirect('/dashboard');
  }

  return <AdminDashboardClient />;
}
