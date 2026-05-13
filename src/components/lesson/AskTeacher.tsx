'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, CheckCircle2, Clock, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { canBookTeacher, type PlanTier } from '@/lib/plan-access';
import Link from 'next/link';
import { toast } from 'sonner';

interface AskTeacherProps {
  lessonId: string;
  userId: string;
  userTier: PlanTier;
}

interface Question {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  created_at: string;
  answered_at: string | null;
}

export function AskTeacher({ lessonId, userId, userTier }: AskTeacherProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQ, setNewQ] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const canAsk = canBookTeacher(userTier);

  useEffect(() => {
    if (!canAsk) return;

    const load = async () => {
      const { data } = await supabase
        .from('teacher_questions')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (data) setQuestions(data as Question[]);
    };

    load();
  }, [lessonId, userId, canAsk, supabase]);

  const submit = async () => {
    if (!newQ.trim()) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from('teacher_questions')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        question: newQ.trim(),
      })
      .select()
      .single();

    if (error) {
      toast.error('Алдаа гарлаа: ' + error.message);
    } else if (data) {
      setQuestions((prev) => [data as Question, ...prev]);
      setNewQ('');
      toast.success('Асуулт илгээгдлээ! Багш удахгүй хариулна.');
    }

    setSubmitting(false);
  };

  if (!canAsk) {
    return (
      <div className="rounded-2xl glass border border-white/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-gold-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-medium mb-1">Багшаас зөвлөгөө авах</h3>
            <p className="text-sm text-white/60 mb-4">
              Basic болон түүнээс дээш гишүүнчлэлтэй хүмүүс багшаас шууд зөвлөгөө авах боломжтой.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 text-sm transition-colors"
            >
              Гишүүнчлэл сонгох
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl glass border border-white/10 p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-emerald-400" />
        <h3 className="text-white font-medium">Багшаас асуух</h3>
      </div>

      <div className="space-y-2 mb-4">
        <textarea
          value={newQ}
          onChange={(e) => setNewQ(e.target.value)}
          placeholder="Хичээлтэй холбоотой асуултаа бичээрэй..."
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50 resize-none"
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-white/40">{newQ.length}/1000</span>
          <button
            onClick={submit}
            disabled={!newQ.trim() || submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-ink-950 text-sm font-medium transition-all"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Илгээж байна...' : 'Илгээх'}
          </button>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="space-y-3 mt-6 pt-6 border-t border-white/10">
          <h4 className="text-sm text-white/60 uppercase tracking-wider">Таны асуултууд</h4>
          {questions.map((q) => (
            <div key={q.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1">
                  <p className="text-sm text-white">{q.question}</p>
                  <p className="text-xs text-white/40 mt-1">
                    {new Date(q.created_at).toLocaleDateString('mn-MN')}
                  </p>
                </div>
                {q.status === 'pending' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-xs">
                    <Clock className="w-3 h-3" />
                    Хүлээгдэж буй
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    Хариултай
                  </span>
                )}
              </div>
              {q.answer && (
                <div className="mt-3 pt-3 border-t border-white/5 pl-3 border-l-2 border-l-emerald-400/30">
                  <p className="text-sm text-white/80">{q.answer}</p>
                  <p className="text-xs text-emerald-400/60 mt-1">— Багш</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
