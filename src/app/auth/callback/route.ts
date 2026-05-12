import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// Admin email-үүд — эдгээр email-ээр нэвтэрвэл автомат admin role олгоно
const ADMIN_EMAILS = [
  'admin@grandmaster.mn',
  'superadmin@grandmaster.mn',
  // Өөрийн admin email-ийг энд нэмнэ үү
];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Admin email шалгаж автоматаар role олгох
      if (ADMIN_EMAILS.includes(data.user.email || '')) {
        try {
          const serviceClient = createServiceClient();
          await serviceClient
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', data.user.id);
        } catch (e) {
          console.error('Admin role олгоход алдаа:', e);
        }
      }

      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
