import { createClient } from '@/lib/supabase/server';
import { Calendar, Clock } from 'lucide-react';
import { AdminBookingStatusSelector } from '@/components/admin/AdminBookingStatusSelector';

export const dynamic = 'force-dynamic';

const WEEKDAYS = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];

/**
 * /admin/bookings — Бүх захиалгуудын жагсаалт + статус өөрчлөх.
 *
 * Admin шууд статусыг өөрчилнө (Approved/Completed/Rejected/Cancelled).
 */
export default async function AdminBookingsPage() {
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, start_at, end_at, status, topic_mn, teacher_note, created_at,
      teacher:teacher_profiles!bookings_teacher_id_fkey(display_name, title_mn),
      student:profiles!bookings_student_id_fkey(full_name)
    `)
    .order('start_at', { ascending: false })
    .limit(200);

  const all = (bookings ?? []) as any[];

  const counts = {
    pending: all.filter((b) => b.status === 'pending').length,
    approved: all.filter((b) => b.status === 'approved').length,
    rejected: all.filter((b) => b.status === 'rejected').length,
    cancelled: all.filter((b) => b.status === 'cancelled').length,
    completed: all.filter((b) => b.status === 'completed').length,
  };

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-medium">Захиалгууд</h1>
        <p className="text-white/50 mt-1 text-sm">Бүх багшийн захиалгуудын хяналт</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <StatCard label="Хүлээгдэж буй" value={counts.pending} color="amber" />
        <StatCard label="Баталгаажсан" value={counts.approved} color="emerald" />
        <StatCard label="Дууссан" value={counts.completed} color="sky" />
        <StatCard label="Татгалзсан" value={counts.rejected} color="red" />
        <StatCard label="Цуцалсан" value={counts.cancelled} color="gray" />
      </div>

      {all.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">Захиалга хараахан гараагүй байна.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs uppercase tracking-wider text-white/40 border-b border-white/10 sticky top-0 bg-ink-900/80 backdrop-blur">
            <div className="col-span-3">Сурагч</div>
            <div className="col-span-3">Багш</div>
            <div className="col-span-3">Цаг</div>
            <div className="col-span-3 text-right">Статус</div>
          </div>
          {all.map((b) => {
            const start = new Date(b.start_at);
            const end = new Date(b.end_at);
            return (
              <div
                key={b.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] items-center"
              >
                <div className="col-span-3 text-sm text-white truncate">
                  {b.student?.full_name || 'Сурагч'}
                  {b.topic_mn && (
                    <div className="text-xs text-white/40 truncate italic mt-0.5">
                      &ldquo;{b.topic_mn}&rdquo;
                    </div>
                  )}
                </div>
                <div className="col-span-3 text-sm text-white/70 truncate">
                  {b.teacher?.display_name || 'Багш'}
                  {b.teacher?.title_mn && (
                    <div className="text-xs text-emerald-400/70 truncate mt-0.5">
                      {b.teacher.title_mn}
                    </div>
                  )}
                </div>
                <div className="col-span-3 text-sm text-white/60">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {start.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' })}
                    <span className="text-white/30">·</span>
                    <span>{WEEKDAYS[start.getDay()]}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/40 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {start.getHours().toString().padStart(2, '0')}:00 — {end.getHours().toString().padStart(2, '0')}:00
                  </div>
                </div>
                <div className="col-span-3 flex justify-end">
                  <AdminBookingStatusSelector
                    bookingId={b.id}
                    currentStatus={b.status}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'amber' | 'emerald' | 'sky' | 'red' | 'gray';
}) {
  const colorMap = {
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
    sky: 'text-sky-300',
    red: 'text-red-300',
    gray: 'text-white/60',
  };
  return (
    <div className="glass rounded-xl p-4">
      <div className={`text-2xl font-display font-medium ${colorMap[color]}`}>
        {value}
      </div>
      <div className="text-xs uppercase tracking-wider text-white/40 mt-1">
        {label}
      </div>
    </div>
  );
}
