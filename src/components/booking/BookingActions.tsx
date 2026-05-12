'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Loader2, CheckCircle2 } from 'lucide-react';

interface BookingActionsProps {
  bookingId: string;
  canApproveReject: boolean;
  canComplete: boolean;
}

export function BookingActions({
  bookingId,
  canApproveReject,
  canComplete,
}: BookingActionsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(status: 'approved' | 'rejected' | 'completed') {
    setSubmitting(status);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          teacher_note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Үйлдэл амжилтгүй');
        setSubmitting(null);
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError('Сүлжээний алдаа');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div>
      {showNote && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="Сурагчид зориулсан тэмдэглэл (заавал биш)..."
          className="w-full mb-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50"
        />
      )}

      {error && (
        <div className="mb-2 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-2 py-1.5">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canApproveReject && (
          <>
            <button
              onClick={() => act('approved')}
              disabled={submitting !== null}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting === 'approved' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Баталгаажуулах
            </button>
            <button
              onClick={() => act('rejected')}
              disabled={submitting !== null}
              className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting === 'rejected' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              Татгалзах
            </button>
          </>
        )}

        {canComplete && (
          <button
            onClick={() => act('completed')}
            disabled={submitting !== null}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/15 text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting === 'completed' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Дууссан гэж тэмдэглэх
          </button>
        )}

        <button
          onClick={() => setShowNote((v) => !v)}
          className="px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white"
        >
          {showNote ? 'Тэмдэглэл хаах' : 'Тэмдэглэл нэмэх'}
        </button>
      </div>
    </div>
  );
}
