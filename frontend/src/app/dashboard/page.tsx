import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const cookieStore = await cookies();          // ✅ await added
  const token = cookieStore.get('access_token');

  if (!token) {
    redirect('/login');
  }

  return <DashboardClient />;
}