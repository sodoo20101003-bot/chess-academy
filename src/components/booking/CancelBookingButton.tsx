'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2 } from 'lucide-react';

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function cancel() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) {
        startTransition(() => router.refresh());
      }
    } finally {
      setSubmitting(false);
      setConfirm(false);
    }
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="text-xs text-red-300/80 hover:text-red-300 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition"
      >
        <X className="w-3.5 h-3.5" />
        Цуцлах
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/60">Цуцлах уу?</span>
      <button
        onClick={() => setConfirm(false)}
        disabled={submitting}
        className="text-xs px-2 py-1 rounded text-white/60 hover:text-white"
      >
        Үгүй
      </button>
      <button
        onClick={cancel}
        disabled={submitting}
        className="text-xs px-3 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-50 flex items-center gap-1"
      >
        {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        Тийм
      </button>
    </div>
  );
}
