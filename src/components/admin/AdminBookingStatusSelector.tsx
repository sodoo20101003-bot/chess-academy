'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Check, X, CheckCircle2, RotateCcw, Loader2, ChevronDown } from 'lucide-react';

type Status = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';

interface Props {
  bookingId: string;
  currentStatus: Status;
}

const STATUS_OPTIONS: { value: Status; label: string; icon: any; cls: string }[] = [
  { value: 'pending',   label: 'Хүлээгдэж буй', icon: Loader2,     cls: 'bg-amber-500/15 text-amber-300' },
  { value: 'approved',  label: 'Баталгаажсан',  icon: Check,       cls: 'bg-emerald-500/15 text-emerald-300' },
  { value: 'completed', label: 'Дууссан',       icon: CheckCircle2, cls: 'bg-sky-500/15 text-sky-300' },
  { value: 'rejected',  label: 'Татгалзсан',    icon: X,           cls: 'bg-red-500/15 text-red-300' },
  { value: 'cancelled', label: 'Цуцалсан',      icon: RotateCcw,   cls: 'bg-white/10 text-white/50' },
];

/**
 * Admin захиалгын статусыг шууд өөрчлөх dropdown.
 * Бүх статусын хооронд чөлөөтэй шилжих боломжтой.
 */
export function AdminBookingStatusSelector({ bookingId, currentStatus }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const current = STATUS_OPTIONS.find((s) => s.value === currentStatus) || STATUS_OPTIONS[0];
  const Icon = current.icon;

  const changeStatus = (newStatus: Status) => {
    if (newStatus === currentStatus) {
      setOpen(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error: updErr } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (updErr) {
        setError(updErr.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        disabled={pending}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${current.cls} hover:opacity-80 transition disabled:opacity-50`}
      >
        {pending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Icon className="w-3 h-3" />
        )}
        {current.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-44 rounded-xl border border-white/10 bg-ink-900 shadow-2xl z-50 py-1">
            {STATUS_OPTIONS.map((opt) => {
              const OptIcon = opt.icon;
              const isCurrent = opt.value === currentStatus;
              return (
                <button
                  key={opt.value}
                  onClick={() => changeStatus(opt.value)}
                  disabled={isCurrent || pending}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-white/5 transition ${
                    isCurrent ? 'opacity-50' : ''
                  }`}
                >
                  <OptIcon className="w-3 h-3" />
                  {opt.label}
                  {isCurrent && <span className="ml-auto text-white/40">●</span>}
                </button>
              );
            })}
          </div>
        </>
      )}

      {error && (
        <div className="absolute top-full mt-1 left-0 px-2 py-1 rounded text-xs bg-red-500/20 text-red-300 whitespace-nowrap z-50">
          {error}
        </div>
      )}
    </div>
  );
}
