import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = [
  'admin@grandmaster.mn',
  'superadmin@grandmaster.mn',
  // Өөрийн admin email-ийг нэмнэ үү
];

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (ADMIN_EMAILS.includes(user.email || '')) {
    const serviceClient = createServiceClient();
    await serviceClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id);
    return NextResponse.json({ role: 'admin' });
  }

  return NextResponse.json({ role: 'student' });
}
