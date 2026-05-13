import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Нэвтэрсэн хэрэглэгчийг буцаана.
 * Нэвтрээгүй бол /login руу redirect хийнэ.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return user;
}