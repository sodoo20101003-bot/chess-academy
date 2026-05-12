import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/bookings/[id]
 *
 * Сурагч: status = 'cancelled' хийнэ (зөвхөн өөрийн pending захиалга)
 * Багш: status = 'approved' | 'rejected' | 'completed' (өөрт ирсэн захиалга)
 *
 * RLS policy эдгээр хязгаарлалтыг DB-түвшинд давхар хийнэ.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const status = body?.status;
  const teacherNote = typeof body?.teacher_note === 'string'
    ? body.teacher_note.slice(0, 1000)
    : undefined;

  const ALLOWED = ['cancelled', 'approved', 'rejected', 'completed'] as const;
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: 'Буруу статус' }, { status: 400 });
  }

  const update: Record<string, any> = { status };
  if (teacherNote !== undefined && (status === 'approved' || status === 'rejected' || status === 'completed')) {
    update.teacher_note = teacherNote;
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    // RLS-аас reject хийгдвэл 404 буцаах нь аюулгүй (id оршин буйг харуулахгүй)
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Олдсонгүй' }, { status: 404 });
    }
    console.error('[bookings/PATCH] error:', error);
    return NextResponse.json({ error: 'Шинэчлэх боломжгүй' }, { status: 400 });
  }

  return NextResponse.json({ booking: data });
}
