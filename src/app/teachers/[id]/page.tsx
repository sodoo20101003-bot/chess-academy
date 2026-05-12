import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canBookTeacher, type PlanTier } from '@/lib/plan-access';
import { BookingCalendar } from '@/components/booking/BookingCalendar';
import { Star, Lock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * /teachers/[id] — Багш нэгэн дэлгэрэнгүй
 *
 * Дэлгэрэнгүй мэдээлэл + цагийн grid (BookingCalendar) харуулна.
 * Plan хязгаарлалт болон давхар захиалгаас сэргийлэх логик нь
 * BookingCalendar-д болон DB-түвшинд хийгдэнэ.
 */
export default async function TeacherDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?next=/teachers/${id}`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_tier')
    .eq('id', user.id)
    .single();

  const userTier = ((profile as any)?.plan_tier ?? null) as PlanTier | null;
  const canBook = canBookTeacher(userTier);

  const { data: teacher } = await supabase
    .from('teacher_profiles')
    .select('id, display_name, title_mn, bio_mn, rating, avatar_url, hourly_note, is_active')
    .eq('id', id)
    .single();

  if (!teacher || !(teacher as any).is_active) {
    notFound();
  }

  const t = teacher as any;

  // Багшийн availability — долоо хоногийн цагийн загвар
  const { data: availability } = await supabase
    .from('teacher_availability')
    .select('weekday, start_hour, end_hour')
    .eq('teacher_id', id);

  // Дараагийн 14 хоногийн active захиалгууд (давхардлаас зайлсхийхэд хэрэглэнэ)
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_at, end_at, status')
    .eq('teacher_id', id)
    .in('status', ['pending', 'approved'])
    .gte('start_at', now.toISOString())
    .lt('start_at', horizon.toISOString());

  return (
    <div className="container mx-auto px-6 py-12 max-w-5xl">
      <Link href="/teachers" className="text-sm text-white/50 hover:text-white">
        ← Багш нар
      </Link>

      {/* Header */}
      <div className="mt-6 flex items-start gap-6 flex-wrap">
        <div className="w-24 h-24 rounded-2xl bg-ink-800 overflow-hidden shrink-0">
          {t.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.avatar_url} alt={t.display_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-white/30">
              ♟
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl md:text-4xl font-medium">{t.display_name}</h1>
          {t.title_mn && (
            <p className="text-emerald-400 mt-1">{t.title_mn}</p>
          )}
          {t.rating && (
            <div className="flex items-center gap-1 mt-2 text-sm text-gold-400">
              <Star className="w-4 h-4 fill-current" />
              <span>{t.rating} FIDE</span>
            </div>
          )}
        </div>
      </div>

      {t.bio_mn && (
        <div className="mt-6 glass rounded-2xl p-5">
          <h2 className="text-xs uppercase tracking-wider text-white/40 mb-2">Танилцуулга</h2>
          <p className="text-white/80 whitespace-pre-line">{t.bio_mn}</p>
        </div>
      )}

      {/* Цаг товлох хэсэг */}
      <div className="mt-8">
        <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="font-display text-2xl">Цаг товлох</h2>
            {t.hourly_note && (
              <p className="text-sm text-white/50 mt-1">{t.hourly_note}</p>
            )}
          </div>
        </div>

        {!canBook ? (
          <div className="glass rounded-2xl p-8 text-center">
            <Lock className="w-10 h-10 text-white/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Багш захиалахын тулд Pro эсвэл Grandmaster planтай байх ёстой
            </h3>
            <p className="text-white/50 mb-6">
              Plan дээшлүүлж хувийн хичээл аваарай
            </p>
            <Link href="/pricing">
              <Button variant="primary">Plan үзэх</Button>
            </Link>
          </div>
        ) : (
          <BookingCalendar
            teacherId={t.id}
            teacherName={t.display_name}
            availability={(availability ?? []) as any}
            existingBookings={(existingBookings ?? []) as any}
          />
        )}
      </div>
    </div>
  );
}
