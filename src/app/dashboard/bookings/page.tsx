import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Calendar, Clock, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CancelBookingButton } from '@/components/booking/CancelBookingButton';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Хүлээгдэж буй', tone: 'bg-gold-500/15 text-gold-300 border-gold-500/30' },
  approved: { label: 'Баталгаажсан', tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  rejected: { label: 'Татгалзсан', tone: 'bg-red-500/15 text-red-300 border-red-500/30' },
  cancelled: { label: 'Цуцалсан', tone: 'bg-white/5 text-white/40 border-white/10' },
  completed: { label: 'Дууссан', tone: 'bg-white/5 text-white/60 border-white/10' },
};

const WEEKDAY_LABELS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];

function formatDate(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  return {
    dateLine: `${yyyy}.${mm}.${dd}`,
    weekday: WEEKDAY_LABELS[d.getDay()],
    time: `${hh}:00`,
  };
}

/**
 * /dashboard/bookings — Сурагчийн "Миний захиалга" хуудас
 *
 * Зурагт байсан маягтай — багшийн нэр, цаг, өдөр, статусыг тодорхой харуулна.
 * Үнэ ОГТ харуулахгүй (хэрэглэгчийн хүсэлтээр).
 */
export default async function MyBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login?next=/dashboard/bookings');
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, start_at, end_at, status, topic_mn, teacher_note, created_at,
      teacher_id,
      teacher:teacher_profiles!bookings_teacher_id_fkey(display_name, title_mn, avatar_url)
    `)
    .eq('student_id', user.id)
    .order('start_at', { ascending: false });

  const upcoming = ((bookings ?? []) as any[]).filter(
    (b) => new Date(b.start_at) >= new Date() && b.status !== 'cancelled' && b.status !== 'rejected'
  );
  const past = ((bookings ?? []) as any[]).filter(
    (b) => !upcoming.includes(b)
  );

  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
        <div>
          <p className="text-emerald-400 text-sm uppercase tracking-[0.2em] mb-2">
            Миний захиалгууд
          </p>
          <h1 className="font-display text-4xl font-medium">
            Багшийн цаг
          </h1>
        </div>
        <Link href="/teachers">
          <Button variant="primary">
            <Calendar className="w-4 h-4" />
            Шинэ цаг товлох
          </Button>
        </Link>
      </div>

      {!bookings || bookings.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 mb-6">Та одоогоор багш захиалаагүй байна.</p>
          <Link href="/teachers">
            <Button variant="primary">Багш нараас сонгох</Button>
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mb-10">
              <h2 className="font-display text-2xl mb-4">Удахгүй болох</h2>
              <div className="space-y-3">
                {upcoming.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="font-display text-2xl mb-4 text-white/70">Өнгөрсөн / Цуцлагдсан</h2>
              <div className="space-y-3">
                {past.map((b) => (
                  <BookingCard key={b.id} booking={b} muted />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function BookingCard({ booking, muted = false }: { booking: any; muted?: boolean }) {
  const teacher = booking.teacher;
  const statusInfo = STATUS_LABELS[booking.status] ?? STATUS_LABELS.pending;
  const { dateLine, weekday, time } = formatDate(booking.start_at);
  const canCancel = booking.status === 'pending' || booking.status === 'approved';

  return (
    <div className={`glass rounded-2xl p-5 ${muted ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-4 flex-wrap">
        {/* Багш */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-full bg-ink-800 overflow-hidden shrink-0">
            {teacher?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={teacher.avatar_url} alt={teacher.display_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white truncate">
              {teacher?.display_name || '— багш олдсонгүй —'}
            </div>
            {teacher?.title_mn && (
              <div className="text-xs text-emerald-400">{teacher.title_mn}</div>
            )}
          </div>
        </div>

        {/* Цаг */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-white/40" />
          <div>
            <div className="font-medium tabular-nums">{dateLine}</div>
            <div className="text-xs text-white/50">{weekday} {time}</div>
          </div>
        </div>

        {/* Статус */}
        <div className={`px-3 py-1 rounded-full text-xs border ${statusInfo.tone}`}>
          {statusInfo.label}
        </div>
      </div>

      {/* Тэмдэглэлүүд */}
      {(booking.topic_mn || booking.teacher_note) && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
          {booking.topic_mn && (
            <div className="flex items-start gap-2 text-sm">
              <MessageSquare className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
              <div>
                <span className="text-white/40 text-xs">Таны хүсэлт:</span>{' '}
                <span className="text-white/80">{booking.topic_mn}</span>
              </div>
            </div>
          )}
          {booking.teacher_note && (
            <div className="flex items-start gap-2 text-sm">
              <MessageSquare className="w-4 h-4 text-emerald-400/60 shrink-0 mt-0.5" />
              <div>
                <span className="text-emerald-400 text-xs">Багшийн тэмдэглэл:</span>{' '}
                <span className="text-white/80">{booking.teacher_note}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Үйлдэл */}
      {canCancel && (
        <div className="mt-4 flex justify-end">
          <CancelBookingButton bookingId={booking.id} />
        </div>
      )}
    </div>
  );
}
