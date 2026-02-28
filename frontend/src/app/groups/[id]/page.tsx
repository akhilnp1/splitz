import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import GroupClient from './GroupClient';

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const cookieStore = await cookies();

  if (!cookieStore.get('access_token')) {
    redirect('/login');
  }

  const groupId = parseInt(resolvedParams.id);

  return <GroupClient groupId={groupId} />;
}
