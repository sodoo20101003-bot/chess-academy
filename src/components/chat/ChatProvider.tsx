import { createClient } from '@/lib/supabase/server';
import { PublicChat } from '@/components/chat/PublicChat';

/**
 * ChatProvider — Layout-аас дуудагдах server component.
 *
 * Нэвтрэн орсон хэрэглэгчийг `PublicChat` widget-руу дамжуулна.
 * Plan tier шалгалт байхгүй — бүх хэрэглэгч нэг public room-д ярилцана.
 *
 * Хуучин `getEffectiveTier` дуудлага хэрэггүй болсон (PublicChat зөвхөн
 * userId хүлээж авдаг).
 */
export async function ChatProvider() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Нэвтрээгүй хэрэглэгчид chat харагдахгүй
  if (!user) return null;

  return <PublicChat userId={user.id} />;
}
