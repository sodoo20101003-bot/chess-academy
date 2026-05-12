'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { createClient } from '@/lib/supabase/client';
import type { LessonAnnotation } from '@/types/database';

type AttachmentDraft = {
  id: string;
  url: string;
  name: string;
  type: 'pdf' | 'image' | 'video' | 'other';
  size?: number;
};

type ExerciseDraft = {
  id: string;
  type: 'find-best-move' | 'find-mate' | 'multiple-choice';
  fen: string;
  prompt_mn: string;
  solution: string;
  hint_mn: string;
  explanation_mn: string;
  points: number;
};

export default function AdminLessonNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courses, setCourses] = useState<Array<{ id: string; title_mn: string | null; title: string }>>([]);

  const [form, setForm] = useState({
    course_id: '',
    title: '',
    title_mn: '',
    description: '',
    content_mn: '',
    video_url: '',
    starting_fen: '',
    pgn: '',
    is_free: false,
    required_tier: 'free',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    is_downloadable: true,
    order_index: 0,
  });

  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [annotations, setAnnotations] = useState<LessonAnnotation[]>([]);
  const [exercises, setExercises] = useState<ExerciseDraft[]>([]);

  // ----- Attachments -----
  function addAttachment() {
    setAttachments((prev) => [
      ...prev,
      { id: `att_${Date.now()}`, url: '', name: '', type: 'pdf' },
    ]);
  }
  function updateAttachment(idx: number, patch: Partial<AttachmentDraft>) {
    setAttachments((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }
  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  // ----- Annotations -----
  function addAnnotation() {
    setAnnotations((prev) => [...prev, { moveIndex: 0, comment_mn: '' }]);
  }
  function updateAnnotation(idx: number, patch: Partial<LessonAnnotation>) {
    setAnnotations((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }
  function removeAnnotation(idx: number) {
    setAnnotations((prev) => prev.filter((_, i) => i !== idx));
  }

  // ----- Exercises -----
  function addExercise() {
    setExercises((prev) => [
      ...prev,
      {
        id: `ex_${Date.now()}`,
        type: 'find-best-move',
        fen: '',
        prompt_mn: '',
        solution: '',
        hint_mn: '',
        explanation_mn: '',
        points: 10,
      },
    ]);
  }
  function updateExercise(idx: number, patch: Partial<ExerciseDraft>) {
    setExercises((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }
  function removeExercise(idx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  // ----- Load courses -----
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('courses')
      .select('id, title, title_mn')
      .order('order_index')
      .then(({ data, error }) => {
        if (error) {
          toast.error('Курсуудыг ачаалахад алдаа: ' + error.message);
        } else if (data) {
          setCourses(data);
        }
        setCoursesLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.course_id) {
      toast.error('Курс сонгоно уу');
      return;
    }
    if (!form.title.trim()) {
      toast.error('Хичээлийн нэр оруулна уу');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const slug = form.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `lesson-${Date.now()}`;

    const cleanAttachments = attachments.filter((a) => a.url.trim() && a.name.trim());
    const cleanExercises = exercises.filter((e) => e.fen.trim() && e.solution.trim());

    const { data, error } = await supabase
      .from('lessons')
      .insert({
        ...form,
        slug,
        annotations: annotations as unknown as never,
        exercises: cleanExercises as unknown as never,
        attachments: cleanAttachments as unknown as never,
      })
      .select('id')
      .single();

    setLoading(false);

    if (error) {
      toast.error('Алдаа: ' + error.message);
      return;
    }
    toast.success('Хичээл амжилттай үүслээ!');
    if (data?.id) {
      router.push(`/lesson/${data.id}`);
    } else {
      router.push('/admin');
    }
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Admin Dashboard руу буцах
      </Link>

      <h1 className="font-display text-4xl md:text-5xl font-medium mb-2">
        Шинэ хичээл үүсгэх
      </h1>
      <p className="text-white/50 mb-10">
        Энд та видео, текст, шатрын нүүдлүүд, тайлбараа нэмж болно.
      </p>

      {coursesLoading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-3" />
          <p className="text-white/50">Курсууд ачаалж байна...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-white/70 mb-4">
            Та одоохондоо курс үүсгээгүй байна. Хичээл нэмэхийн тулд эхлээд курс үүсгэх шаардлагатай.
          </p>
          <Link href="/admin/courses/new">
            <Button variant="primary">Курс үүсгэх</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1fr_500px] gap-8">
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-lg">Үндсэн мэдээлэл</h2>

              <div>
                <label className="block text-sm text-white/70 mb-2">Курс *</label>
                <select
                  required
                  value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Сонгох...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id} className="bg-ink-900">
                      {c.title_mn || c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Гарчиг (англи) *</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                    placeholder="Italian Opening"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Гарчиг (Монгол)</label>
                  <input
                    value={form.title_mn}
                    onChange={(e) => setForm({ ...form, title_mn: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                    placeholder="Италийн нээлт"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Богино тайлбар</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                  placeholder="Энэ хичээлээр та юу сурах вэ?"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Бичлэг / Тайлбар (Монгол) ⭐
                  <span className="text-xs text-emerald-400 ml-2">— website-аас шууд гарна</span>
                </label>
                <textarea
                  value={form.content_mn}
                  onChange={(e) => setForm({ ...form, content_mn: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none resize-y font-mono text-sm"
                  placeholder={`# Хичээлийн нэр\n\nИталийн нээлт нь шатрын хамгийн алдартай нээлтийн нэг юм...\n\n## Үндсэн санаа\n- Төвийг хяналтандаа авах\n- Хурдан хөгжүүлэлт`}
                />
                <p className="text-xs text-white/40 mt-2">Markdown дэмждэг</p>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-lg">Шатрын контент</h2>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Эхлэлийн позиц (FEN)
                  <span className="text-xs text-white/40 ml-2">— хоосон бол стандарт байрлал</span>
                </label>
                <input
                  value={form.starting_fen}
                  onChange={(e) => setForm({ ...form, starting_fen: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none font-mono text-sm"
                  placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Нүүдлүүд (PGN format)</label>
                <textarea
                  value={form.pgn}
                  onChange={(e) => setForm({ ...form, pgn: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none resize-y font-mono text-sm"
                  placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6"
                />
              </div>
            </div>

            <div className="glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">
                  Нүүдэл бүрийн тайлбар
                  <span className="text-xs text-white/40 ml-2">(сонголтоор)</span>
                </h2>
                <Button type="button" variant="outline" size="sm" onClick={addAnnotation}>
                  <Plus className="h-3 w-3" /> Нэмэх
                </Button>
              </div>

              {annotations.map((ann, i) => (
                <div key={i} className="bg-white/[0.02] rounded-xl p-4 space-y-3 border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50">Нүүдэл №</span>
                    <input
                      type="number"
                      min={0}
                      value={ann.moveIndex}
                      onChange={(e) => updateAnnotation(i, { moveIndex: Number(e.target.value) })}
                      className="w-20 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm"
                    />
                    <button type="button" onClick={() => removeAnnotation(i)} className="ml-auto text-white/40 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    value={ann.comment_mn || ''}
                    onChange={(e) => updateAnnotation(i, { comment_mn: e.target.value })}
                    rows={2}
                    placeholder="Энэ нүүдлийн тухай тайлбар..."
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-emerald-500 focus:outline-none resize-y"
                  />
                </div>
              ))}
            </div>

            <div className="glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">
                  Дасгалууд
                  <span className="text-xs text-white/40 ml-2">(сурагчид интерактив бодох)</span>
                </h2>
                <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                  <Plus className="h-3 w-3" /> Нэмэх
                </Button>
              </div>

              {exercises.length === 0 && (
                <p className="text-sm text-white/40 text-center py-8">
                  Дасгал нэмж сурагчдаар интерактив бодуулах боломжтой.
                </p>
              )}

              {exercises.map((ex, i) => (
                <div key={ex.id} className="bg-white/[0.02] rounded-xl p-4 space-y-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-emerald-400">№{i + 1}</span>
                    <select
                      value={ex.type}
                      onChange={(e) => updateExercise(i, { type: e.target.value as ExerciseDraft['type'] })}
                      className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm"
                    >
                      <option value="find-best-move" className="bg-ink-900">Шилдэг нүүдлийг олох</option>
                      <option value="find-mate" className="bg-ink-900">Шах ба матыг олох</option>
                      <option value="multiple-choice" className="bg-ink-900">Сонголттой асуулт</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={ex.points}
                      onChange={(e) => updateExercise(i, { points: Number(e.target.value) })}
                      className="w-16 h-9 px-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                      title="Оноо"
                    />
                    <span className="text-xs text-white/50">оноо</span>
                    <button type="button" onClick={() => removeExercise(i)} className="ml-auto text-white/40 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <input
                    value={ex.prompt_mn}
                    onChange={(e) => updateExercise(i, { prompt_mn: e.target.value })}
                    placeholder="Жишээ нь: Шилдэг нүүдлийг олоорой"
                    className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-sm"
                  />
                  <input
                    value={ex.fen}
                    onChange={(e) => updateExercise(i, { fen: e.target.value })}
                    placeholder="FEN: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                    className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-mono"
                  />
                  <input
                    value={ex.solution}
                    onChange={(e) => updateExercise(i, { solution: e.target.value })}
                    placeholder="Зөв хариу: e2e4 (UCI format)"
                    className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-sm font-mono"
                  />
                  <textarea
                    value={ex.hint_mn}
                    onChange={(e) => updateExercise(i, { hint_mn: e.target.value })}
                    placeholder="Зөвлөгөө (сонголтоор)"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm resize-y"
                  />
                  <textarea
                    value={ex.explanation_mn}
                    onChange={(e) => updateExercise(i, { explanation_mn: e.target.value })}
                    placeholder="Тайлбар (зөв хариулсны дараа харагдана)"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm resize-y"
                  />
                </div>
              ))}
            </div>

            <div className="glass rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-lg">Тохиргоо</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Видео URL</label>
                  <input
                    value={form.video_url}
                    onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Эрхийн төвшин</label>
                  <select
                    value={form.required_tier}
                    onChange={(e) => setForm({ ...form, required_tier: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="free" className="bg-ink-900">Үнэгүй</option>
                    <option value="basic" className="bg-ink-900">Basic</option>
                    <option value="pro" className="bg-ink-900">Pro</option>
                    <option value="grandmaster" className="bg-ink-900">Grandmaster</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Хичээлийн түвшин</label>
                  <select
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
                    className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="beginner" className="bg-ink-900">Анхан шат</option>
                    <option value="intermediate" className="bg-ink-900">Дунд шат</option>
                    <option value="advanced" className="bg-ink-900">Ахисан шат</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Дараалал</label>
                  <input
                    type="number"
                    min={0}
                    value={form.order_index}
                    onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })}
                    className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_free}
                    onChange={(e) => setForm({ ...form, is_free: e.target.checked })}
                    className="h-4 w-4 rounded accent-emerald-500"
                  />
                  <span className="text-sm">Үнэгүй хичээл (бүгд үзэх боломжтой)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_downloadable}
                    onChange={(e) => setForm({ ...form, is_downloadable: e.target.checked })}
                    className="h-4 w-4 rounded accent-emerald-500"
                  />
                  <span className="text-sm">Татаж авах боломжтой (Basic+)</span>
                </label>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Хавсралт файлууд</h3>
                  <p className="text-xs text-white/50 mt-1">
                    Хичээлд нэмэлт материал (PDF, зураг, видео) хавсаргах. Татах боломжтой.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addAttachment}>
                  <Plus className="w-4 h-4" />
                  Нэмэх
                </Button>
              </div>

              {attachments.length === 0 && (
                <p className="text-sm text-white/40 text-center py-4">
                  Хавсралт байхгүй. Дээрх товчийг даран PDF, зураг, видео нэмж болно.
                </p>
              )}

              {attachments.map((att, idx) => (
                <div key={att.id} className="grid grid-cols-12 gap-2 items-start p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <input
                    value={att.name}
                    onChange={(e) => updateAttachment(idx, { name: e.target.value })}
                    placeholder="Файлын нэр"
                    className="col-span-3 h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    value={att.url}
                    onChange={(e) => updateAttachment(idx, { url: e.target.value })}
                    placeholder="https://... (Supabase Storage URL)"
                    className="col-span-6 h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                  <select
                    value={att.type}
                    onChange={(e) => updateAttachment(idx, { type: e.target.value as 'pdf' | 'image' | 'video' | 'other' })}
                    className="col-span-2 h-10 px-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="pdf" className="bg-ink-900">PDF</option>
                    <option value="image" className="bg-ink-900">Зураг</option>
                    <option value="video" className="bg-ink-900">Видео</option>
                    <option value="other" className="bg-ink-900">Бусад</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="col-span-1 h-10 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Хичээл нийтлэх
            </Button>
          </div>

          <div className="lg:sticky lg:top-6 self-start">
            <div className="text-xs uppercase tracking-wider text-emerald-400 mb-3">
              Урьдчилан харах
            </div>
            <ChessBoard
              initialFen={form.starting_fen || undefined}
              pgn={form.pgn || undefined}
              annotations={annotations}
              interactive={!form.pgn}
            />
          </div>
        </form>
      )}
    </div>
  );
}
