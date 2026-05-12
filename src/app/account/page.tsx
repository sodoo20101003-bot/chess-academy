import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AccountClient } from './AccountClient';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login?redirect=/account');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: payments } = await supabase
    .from('payments')
    .select('*, subscription_plans(name_mn, name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_mnt', { ascending: true });

  return (
    <AccountClient
      user={{ id: user.id, email: user.email ?? '' }}
      profile={profile}
      payments={payments ?? []}
      plans={plans ?? []}
    />
  );
}
