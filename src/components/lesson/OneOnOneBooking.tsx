'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video, MessageCircle, Calendar, Lock, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { canBookOneOnOne, type PlanTier } from '@/lib/plan-access';
import Link from 'next/link';
import { toast } from 'sonner';

interface OneOnOneBookingProps {
  userId: string;
  userTier: PlanTier;
}

interface Booking {
  id: string;
  session_type: 'video' | 'chat';
  scheduled_at: string;
  status: string;
  meeting_url: string | null;
  notes_user: string | null;
  month_used: string;
}

export function OneOnOneBooking({ userId, userTier }: OneOnOneBookingProps) {
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [sessionType, setSessionType] = useState<'video' | 'chat'>('video');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const canBook = canBookOneOnOne(userTier);
  const currentMonth = new Date().toISOString().slice(0, 7); // 2026-05

  useEffect(() => {
    if (!canBook) return;

    const load = async () => {
      const { data } = await supabase
        .from('teacher_bookings')
        .select('*')
        .eq('user_id', userId)
        .eq('month_used', currentMonth)
        .neq('status', 'cancelled')
        .single();

      if (data) setActiveBooking(data as Booking);
    };

    load();
  }, [userId, currentMonth, canBook, supabase]);

  const submit = async () => {
    if (!scheduledDate) {
      toast.error('Огноо сонгоно уу');
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('teacher_bookings')
      .insert({
        user_id: userId,
        session_type: sessionType,
        scheduled_at: new Date(scheduledDate).toISOString(),
        notes_user: notes,
        month_used: currentMonth,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('Та энэ сард аль хэдийн нэг session захиалсан байна');
      } else {
        toast.error('Алдаа: ' + error.message);
      }
    } else if (data) {
      setActiveBooking(data as Booking);
      setShowForm(false);
      toast.success('Захиалга амжилттай! Багш баталгаажуулсны дараа холбогдоно.');
    }

    setLoading(false);
  };

  if (!canBook) {
    return (
      <div className="rounded-2xl glass border border-white/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-gold-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-medium mb-1">1-on-1 багштай уулзах</h3>
            <p className="text-sm text-white/60 mb-4">
              Pro гишүүнчлэлтэй хэрэглэгчид сард 1 удаа багштай video эсвэл chat session хийнэ.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 text-sm transition-colors"
            >
              Pro руу шилжих
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (activeBooking) {
    const isVideo = activeBooking.session_type === 'video';
    const Icon = isVideo ? Video : MessageCircle;
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-300',
      confirmed: 'bg-emerald-500/20 text-emerald-300',
      completed: 'bg-blue-500/20 text-blue-300',
    };

    return (
      <div className="rounded-2xl glass border border-emerald-500/20 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-white font-medium">
                {isVideo ? 'Video session' : 'Chat session'} энэ сард
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${statusColors[activeBooking.status] || 'bg-white/10 text-white'}`}
              >
                {activeBooking.status === 'pending' && 'Хүлээгдэж буй'}
                {activeBooking.status === 'confirmed' && 'Баталгаажсан'}
                {activeBooking.status === 'completed' && 'Дууссан'}
              </span>
            </div>
            <p className="text-sm text-white/60 mb-3">
              <Calendar className="inline w-4 h-4 mr-1" />
              {new Date(activeBooking.scheduled_at).toLocaleString('mn-MN', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {activeBooking.meeting_url && activeBooking.status === 'confirmed' && (
              <a
                href={activeBooking.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-ink-950 text-sm font-medium transition-colors"
              >
                <Video className="w-4 h-4" />
                Холбогдох
              </a>
            )}
            {activeBooking.status === 'pending' && (
              <p className="text-xs text-white/40">
                Багш удахгүй баталгаажуулна. Холбоосыг и-мэйлээр илгээх болно.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl glass border border-white/10 p-6">
      <div className="flex items-center gap-2 mb-1">
        <Video className="w-5 h-5 text-emerald-400" />
        <h3 className="text-white font-medium">1-on-1 багштай session</h3>
      </div>
      <p className="text-sm text-white/50 mb-4">
        Сард 1 удаа багштай уулзах боломжтой. Энэ сард: <span className="text-emerald-400">1 / 1</span>
      </p>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-ink-950 font-medium transition-colors"
        >
          Session захиалах
        </button>
      ) : (
        <div className="space-y-4">
          {/* Session type */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Session төрөл</label>
            <div className="grid grid-cols-2 gap-2">
              {(['video', 'chat'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSessionType(type)}
                  className={`flex items-center gap-2 justify-center px-4 py-3 rounded-xl border transition-all ${
                    sessionType === type
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                  }`}
                >
                  {type === 'video' ? <Video className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                  <span className="text-sm">{type === 'video' ? 'Video call' : 'Chat'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Хүссэн огноо ба цаг</label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-400/50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Юуг ярилцахыг хүсэж байгаа вэ?</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Сонирхож буй сэдэв, асуудал..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
            >
              Болих
            </button>
            <button
              onClick={submit}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-ink-950 font-medium transition-colors"
            >
              {loading ? 'Илгээж байна...' : 'Захиалах'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
