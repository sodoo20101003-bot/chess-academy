'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Availability {
  weekday: number;     // 0=Sun..6=Sat
  start_hour: number;
  end_hour: number;
}

interface ExistingBooking {
  start_at: string;
  end_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
}

interface BookingCalendarProps {
  teacherId: string;
  teacherName: string;
  availability: Availability[];
  existingBookings: ExistingBooking[];
}

const WEEKDAY_LABELS_MN = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
const MONTH_LABELS_MN = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];

type SlotStatus =
  | 'unavailable'   // Багш энэ цагт ажилладаггүй
  | 'past'          // Өнгөрсөн цаг
  | 'booked'        // Захиалагдсан (өөр сурагчийн)
  | 'available';    // Захиалж болно

interface Slot {
  date: Date;       // local
  hour: number;
  status: SlotStatus;
}

export function BookingCalendar({
  teacherId,
  teacherName,
  availability,
  existingBookings,
}: BookingCalendarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Долоо хоног (7 хоног) — эхлэх огноо
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Цаг хязгаар — 09:00 - 22:00 (ezaal.mn-тэй ойролцоо)
  const HOUR_FROM = 9;
  const HOUR_TO = 22;

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // Захиалагдсан цагуудыг Set-д хадгалах
  const bookedSet = useMemo(() => {
    const s = new Set<string>();
    for (const b of existingBookings) {
      // 'start_at' нь UTC ISO — Date-р хөрвүүлж, локал full-hour-аар key үүсгэнэ
      const d = new Date(b.start_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
      s.add(key);
    }
    return s;
  }, [existingBookings]);

  // Багшийн availability-г weekday-аар nguyentyn хадгалах
  const availByWeekday = useMemo(() => {
    const m = new Map<number, Array<{ start: number; end: number }>>();
    for (const a of availability) {
      const arr = m.get(a.weekday) ?? [];
      arr.push({ start: a.start_hour, end: a.end_hour });
      m.set(a.weekday, arr);
    }
    return m;
  }, [availability]);

  function getSlotStatus(date: Date, hour: number): SlotStatus {
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);

    if (slotStart < new Date()) return 'past';

    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${hour}`;
    if (bookedSet.has(key)) return 'booked';

    const ranges = availByWeekday.get(date.getDay()) ?? [];
    const isAvailable = ranges.some((r) => hour >= r.start && hour < r.end);
    if (!isAvailable) return 'unavailable';

    return 'available';
  }

  const hours = useMemo(
    () => Array.from({ length: HOUR_TO - HOUR_FROM }, (_, i) => HOUR_FROM + i),
    []
  );

  const monthLabel = useMemo(() => {
    const first = days[0];
    const last = days[6];
    if (first.getMonth() === last.getMonth()) {
      return MONTH_LABELS_MN[first.getMonth()];
    }
    return `${MONTH_LABELS_MN[first.getMonth()]} – ${MONTH_LABELS_MN[last.getMonth()]}`;
  }, [days]);

  function navigateWeek(direction: -1 | 1) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7 * direction);
    // 2 долоо хоногоос цааш битгий
    const maxStart = new Date();
    maxStart.setDate(maxStart.getDate() + 14);
    if (direction === 1 && d > maxStart) return;
    // Өнөөдөр өмнө битгий
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (direction === -1 && d < today) return;
    setWeekStart(d);
  }

  function selectSlot(date: Date, hour: number) {
    const status = getSlotStatus(date, hour);
    if (status !== 'available') return;
    setSelectedSlot({ date, hour, status });
    setError(null);
    setSuccess(false);
  }

  async function confirmBooking() {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);

    const startAt = new Date(selectedSlot.date);
    startAt.setHours(selectedSlot.hour, 0, 0, 0);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: teacherId,
          start_at: startAt.toISOString(),
          topic: topic.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Захиалга үүсгэхэд алдаа гарлаа');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setSelectedSlot(null);
      setTopic('');
      startTransition(() => router.refresh());
    } catch (e) {
      setError('Сүлжээний алдаа');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Тайлбар */}
      <div className="flex items-center gap-4 flex-wrap mb-3 text-xs text-white/50">
        <LegendDot color="bg-emerald-500/30 border-emerald-500/60" label="Захиалж болно" />
        <LegendDot color="bg-white/10 border-white/20" label="Захиалагдсан" />
        <LegendDot color="bg-transparent border-white/10" label="Багш ажиллахгүй" />
      </div>

      {/* Долоо хоног navigation */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition disabled:opacity-30"
            aria-label="Өмнөх долоо хоног"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">{monthLabel}</span>
          </div>
          <button
            onClick={() => navigateWeek(1)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition disabled:opacity-30"
            aria-label="Дараагийн долоо хоног"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-3 py-2 text-left text-xs text-white/40 font-normal w-16">Цаг</th>
                {days.map((d, i) => {
                  const isToday =
                    d.toDateString() === new Date().toDateString();
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th
                      key={i}
                      className={`px-2 py-2 text-center text-xs font-normal ${
                        isToday ? 'text-emerald-400' : isWeekend ? 'text-gold-400/80' : 'text-white/60'
                      }`}
                    >
                      <div className="font-medium">
                        {d.getDate()}
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">
                        {WEEKDAY_LABELS_MN[d.getDay()]}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => (
                <tr key={h} className="border-b border-white/5 last:border-b-0">
                  <td className="px-3 py-1.5 text-xs text-white/40 tabular-nums whitespace-nowrap">
                    {String(h).padStart(2, '0')}:00
                  </td>
                  {days.map((d, di) => {
                    const status = getSlotStatus(d, h);
                    const isSelected =
                      selectedSlot &&
                      selectedSlot.hour === h &&
                      selectedSlot.date.toDateString() === d.toDateString();
                    return (
                      <td key={di} className="p-1">
                        <SlotCell
                          status={status}
                          selected={!!isSelected}
                          onClick={() => selectSlot(d, h)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Сонгосон цагийн form */}
      <AnimatePresence>
        {selectedSlot && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-5 glass rounded-2xl p-5"
          >
            <h3 className="font-semibold mb-1">Захиалга баталгаажуулах</h3>
            <p className="text-sm text-white/60 mb-4">
              <strong>{teacherName}</strong> багштай{' '}
              <strong>
                {selectedSlot.date.getDate()}-ний {WEEKDAY_LABELS_MN[selectedSlot.date.getDay()]}{' '}
                {String(selectedSlot.hour).padStart(2, '0')}:00
              </strong>{' '}
              цагт 1 цагийн хичээл.
            </p>

            <label className="block text-xs text-white/50 mb-1">
              Юу сурахыг хүсэж буйгаа тэмдэглэх (заавал биш)
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Жнь: Сицилийн хамгаалалт, төгсгөл..."
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50 mb-4"
            />

            {error && (
              <div className="mb-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSelectedSlot(null)}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
              >
                Болих
              </button>
              <button
                onClick={confirmBooking}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-ink-950 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Илгээж байна...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Захиалга өгөх
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Амжилттай */}
      <AnimatePresence>
        {success && !selectedSlot && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 flex items-center gap-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3"
          >
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-white">
                Захиалга илгээгдлээ. Багш баталгаажуулсны дараа танд мэдэгдэх болно.
              </p>
            </div>
            <a
              href="/dashboard/bookings"
              className="text-sm text-emerald-300 hover:text-emerald-200"
            >
              Миний захиалга →
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SlotCell({
  status,
  selected,
  onClick,
}: {
  status: SlotStatus;
  selected: boolean;
  onClick: () => void;
}) {
  if (status === 'available') {
    return (
      <button
        onClick={onClick}
        className={`w-full h-9 rounded-md border text-xs font-medium transition-all ${
          selected
            ? 'bg-emerald-500 border-emerald-400 text-ink-950 shadow-lg shadow-emerald-500/30'
            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 hover:border-emerald-400'
        }`}
      >
        {selected ? '✓' : 'сонгох'}
      </button>
    );
  }
  if (status === 'booked') {
    return (
      <div className="w-full h-9 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/30">
        захиалагдсан
      </div>
    );
  }
  if (status === 'past') {
    return <div className="w-full h-9 rounded-md bg-white/[0.02]" />;
  }
  return <div className="w-full h-9 rounded-md border border-dashed border-white/[0.06]" />;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-sm border ${color}`} />
      <span>{label}</span>
    </div>
  );
}
