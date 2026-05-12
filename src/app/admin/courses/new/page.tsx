import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * /admin/courses/new — Шинэ курс үүсгэх форм.
 *
 * Server action ашиглаж шууд `courses` хүснэгтэд insert хийнэ.
 */
export default async function NewCoursePage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-2xl">
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Курсууд
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-4xl font-medium">Шинэ курс</h1>
        <p className="text-white/50 mt-2">Курсын ерөнхий мэдээллийг бөглөнө үү</p>
      </div>

      <form action={createCourse} className="space-y-5 glass rounded-2xl p-6">
        <div>
          <label className="block text-sm text-white/70 mb-2">Гарчиг (Монгол) *</label>
          <input
            type="text"
            name="title_mn"
            required
            maxLength={200}
            placeholder="Жнь: Нээлтийн стратеги"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50"
          />
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-2">Гарчиг (Англи)</label>
          <input
            type="text"
            name="title"
            maxLength={200}
            placeholder="e.g. Opening Strategy"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50"
          />
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-2">Slug (URL хэсэг) *</label>
          <input
            type="text"
            name="slug"
            required
            pattern="[a-z0-9-]+"
            maxLength={100}
            placeholder="opening-strategy"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50 font-mono text-sm"
          />
          <p className="text-xs text-white/40 mt-1">
            Зөвхөн жижиг үсэг, тоо, зураас (-). Жнь: <code className="text-emerald-300">opening-strategy</code>
          </p>
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-2">Тайлбар (Монгол)</label>
          <textarea
            name="description_mn"
            rows={3}
            maxLength={1000}
            placeholder="Курсын тайлбар..."
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-2">Plan tier *</label>
          <select
            name="plan_tier"
            required
            defaultValue="basic"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-400/50"
          >
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="grandmaster">Grandmaster</option>
          </select>
          <p className="text-xs text-white/40 mt-1">
            Курсыг үзэхийн тулд хэрэглэгчийн хамгийн багадаа авах ёстой plan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_published"
            name="is_published"
            defaultChecked
            className="w-4 h-4 rounded bg-white/10 border-white/20"
          />
          <label htmlFor="is_published" className="text-sm text-white/70">
            Нийтлэх (сурагчид харна)
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <Link
            href="/admin/courses"
            className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 transition text-sm"
          >
            Болих
          </Link>
          <button
            type="submit"
            className="flex-1 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-ink-950 transition text-sm font-semibold"
          >
            Курс үүсгэх
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Server action — шинэ курс үүсгэх.
 */
async function createCourse(formData: FormData) {
  'use server';

  const supabase = await createClient();

  // Эрх шалгах
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile as any).role !== 'admin') {
    throw new Error('Admin эрх шаардлагатай');
  }

  const title_mn = String(formData.get('title_mn') || '').trim();
  const title = String(formData.get('title') || '').trim() || title_mn;
  const slug = String(formData.get('slug') || '').trim();
  const description_mn = String(formData.get('description_mn') || '').trim();
  const plan_tier = String(formData.get('plan_tier') || 'basic');
  const is_published = formData.get('is_published') === 'on';

  if (!title_mn || !slug) {
    throw new Error('Гарчиг ба slug заавал бөглөнө');
  }

  const { error } = await supabase.from('courses').insert({
    title,
    title_mn,
    slug,
    description_mn: description_mn || null,
    plan_tier,
    is_published,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('Энэ slug аль хэдийн ашиглагдсан байна');
    }
    throw new Error(error.message || 'Үүсгэхэд алдаа гарлаа');
  }

  redirect('/admin/courses');
}
