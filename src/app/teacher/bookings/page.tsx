import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth-guard';
import { Calendar, Clock, User } from 'lucide-react';
import { BookingActions } from '@/components/booking/BookingActions';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Хүлээгдэж буй', tone: 'bg-gold-500/15 text-gold-300 border-gold-500/30' },
  approved: { label: 'Баталгаажсан', tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  rejected: { label: 'Татгалзсан', tone: 'bg-red-500/15 text-red-300 border-red-500/30' },
  cancelled: { label: 'Цуцалсан', tone: 'bg-white/5 text-white/40 border-white/10' },
  completed: { label: 'Дууссан', tone: 'bg-white/5 text-white/60 border-white/10' },
};

const WEEKDAY_LABELS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];

/**
 * /teacher/bookings — Багш өөрт ирсэн захиалгуудыг харж баталгаажуулна.
 *
 * Зөвхөн `teacher` role-тай (эсвэл teacher_profiles-д бүртгэлтэй)
 * хэрэглэгчид хүртэх боломжтой.
 */
export default async function TeacherBookingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Багш мөн эсэхийг шалгах
  const { data: teacherProfile } = await supabase
    .from('teacher_profiles')
    .select('id, display_name')
    .eq('id', user.id)
    .single();

  if (!teacherProfile) {
    redirect('/dashboard');
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, start_at, end_at, status, topic_mn, teacher_note, created_at,
      student_id,
      student:profiles!bookings_student_id_fkey(full_name, avatar_url)
    `)
    .eq('teacher_id', user.id)
    .order('start_at', { ascending: true });

  const pending = ((bookings ?? []) as any[]).filter((b) => b.status === 'pending');
  const upcoming = ((bookings ?? []) as any[]).filter(
    (b) => b.status === 'approved' && new Date(b.start_at) >= new Date()
  );
  const past = ((bookings ?? []) as any[]).filter(
    (b) => !pending.includes(b) && !upcoming.includes(b)
  );

  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <div className="mb-8">
        <p className="text-emerald-400 text-sm uppercase tracking-[0.2em] mb-2">
          Багшийн хуудас
        </p>
        <h1 className="font-display text-4xl font-medium">Захиалгууд</h1>
        <p className="text-white/50 mt-2">
          Танд ирсэн захиалгуудыг баталгаажуулах, татгалзах
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-10">
        <StatTile label="Хүлээгдэж буй" value={pending.length} tone="gold" />
        <StatTile label="Удахгүй болох" value={upcoming.length} tone="emerald" />
        <StatTile label="Нийт" value={bookings?.length ?? 0} tone="neutral" />
      </div>

      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-2xl mb-4">
            Шинэ хүсэлтүүд
            <span className="ml-2 text-xs text-gold-400">{pending.length}</span>
          </h2>
          <div className="space-y-3">
            {pending.map((b) => (
              <TeacherBookingCard key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-2xl mb-4">Удахгүй болох</h2>
          <div className="space-y-3">
            {upcoming.map((b) => (
              <TeacherBookingCard key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="font-display text-2xl mb-4 text-white/60">Өнгөрсөн</h2>
          <div className="space-y-3">
            {past.map((b) => (
              <TeacherBookingCard key={b.id} booking={b} muted />
            ))}
          </div>
        </section>
      )}

      {(!bookings || bookings.length === 0) && (
        <div className="glass rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">Танд хараахан захиалга ирээгүй байна.</p>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: 'gold' | 'emerald' | 'neutral' }) {
  const color = tone === 'gold' ? 'text-gold-400' : tone === 'emerald' ? 'text-emerald-400' : 'text-white';
  return (
    <div className="glass rounded-2xl p-5">
      <div className={`text-3xl font-display font-medium tabular-nums ${color}`}>{value}</div>
      <div className="text-xs uppercase tracking-wider text-white/40 mt-1">{label}</div>
    </div>
  );
}

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

function TeacherBookingCard({ booking, muted = false }: { booking: any; muted?: boolean }) {
  const student = booking.student;
  const statusInfo = STATUS_LABELS[booking.status] ?? STATUS_LABELS.pending;
  const { dateLine, weekday, time } = formatDate(booking.start_at);
  const canAct = booking.status === 'pending';
  const canComplete = booking.status === 'approved' && new Date(booking.start_at) < new Date();

  return (
    <div className={`glass rounded-2xl p-5 ${muted ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-full bg-ink-800 overflow-hidden shrink-0">
            {student?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={student.avatar_url} alt={student.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white truncate">
              {student?.full_name || 'Нэргүй'}
            </div>
            <div className="text-xs text-white/50">Сурагч</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-white/40" />
          <div>
            <div className="font-medium tabular-nums">{dateLine}</div>
            <div className="text-xs text-white/50">{weekday} {time}</div>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full text-xs border ${statusInfo.tone}`}>
          {statusInfo.label}
        </div>
      </div>

      {booking.topic_mn && (
        <div className="mt-3 text-sm text-white/70 bg-white/[0.03] rounded-lg px-3 py-2">
          <span className="text-xs text-white/40">Сурагчийн хүсэлт: </span>
          {booking.topic_mn}
        </div>
      )}

      {booking.teacher_note && (
        <div className="mt-3 text-sm text-white/70 bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2">
          <span className="text-xs text-emerald-400">Таны тэмдэглэл: </span>
          {booking.teacher_note}
        </div>
      )}

      {(canAct || canComplete) && (
        <div className="mt-4">
          <BookingActions
            bookingId={booking.id}
            canApproveReject={canAct}
            canComplete={canComplete}
          />
        </div>
      )}
    </div>
  );
}
