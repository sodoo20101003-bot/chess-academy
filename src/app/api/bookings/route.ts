import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings — Шинэ захиалга үүсгэх
 *
 * Body: { teacher_id: uuid, start_at: ISO string, topic?: string }
 *
 * Бүх validation болон давхардсан цагаас сэргийлэх логик нь `book_lesson` RPC
 * дотор атомик байдлаар хийгдэнэ. Энд бид зөвхөн алдаануудыг ойлгомжтой
 * message-руу хөрвүүлж буцаана.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Нэвтрэх шаардлагатай' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Буруу формат' }, { status: 400 });
  }

  const teacherId = typeof body?.teacher_id === 'string' ? body.teacher_id : null;
  const startAtStr = typeof body?.start_at === 'string' ? body.start_at : null;
  const topic = typeof body?.topic === 'string' ? body.topic.slice(0, 500) : null;

  if (!teacherId || !startAtStr) {
    return NextResponse.json({ error: 'Багш ба цаг шаардлагатай' }, { status: 400 });
  }

  const startAt = new Date(startAtStr);
  if (isNaN(startAt.getTime())) {
    return NextResponse.json({ error: 'Цагийн формат буруу' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('book_lesson', {
    p_teacher_id: teacherId,
    p_start_at: startAt.toISOString(),
    p_topic: topic,
  });

  if (error) {
    // RPC-ийн error code-уудыг ойлгомжтой мессеж рүү map хийх
    const msg = error.message || '';
    if (msg.includes('Зөвхөн Pro эсвэл Grandmaster')) {
      return NextResponse.json(
        { error: 'Зөвхөн Pro эсвэл Grandmaster planтай хэрэглэгч багш захиалж чадна' },
        { status: 403 }
      );
    }
    if (msg.includes('аль хэдийн захиалагдсан')) {
      return NextResponse.json(
        { error: 'Энэ цаг аль хэдийн захиалагдсан байна. Өөр цаг сонгоно уу.' },
        { status: 409 }
      );
    }
    if (msg.includes('Өнгөрсөн цагт')) {
      return NextResponse.json(
        { error: 'Өнгөрсөн цагт захиалж болохгүй' },
        { status: 400 }
      );
    }
    if (msg.includes('Багш олдсонгүй')) {
      return NextResponse.json({ error: 'Багш олдсонгүй' }, { status: 404 });
    }
    if (msg.includes('бүтэн цагаар')) {
      return NextResponse.json(
        { error: 'Цаг бүтэн цагаар сонгоно уу' },
        { status: 400 }
      );
    }
    console.error('[bookings] RPC error:', error);
    return NextResponse.json({ error: 'Дотоод алдаа гарлаа' }, { status: 500 });
  }

  return NextResponse.json({ booking: data }, { status: 201 });
}
