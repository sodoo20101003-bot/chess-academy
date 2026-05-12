import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * /admin/courses — Курсуудын жагсаалт
 *
 * Хичээлүүдийг бүлэглэх "курс" гэсэн ангиллын admin хуудас. Plan tier-аас
 * ялгаатай — plan нь захиалгын түвшин, курс нь логикоор бүлэгсэн хичээлүүд.
 */
export default async function AdminCoursesPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, title_mn, slug, plan_tier, created_at, lessons(count)')
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto px-6 py-12 max-w-6xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Admin Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl font-medium">Курсууд</h1>
        <p className="text-white/50 mt-2">Хичээлүүдийг бүлэглэсэн курсууд</p>
      </div>

      {!courses || courses.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">Курс бүртгэгдээгүй байна.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(courses as any[]).map((c) => (
            <div key={c.id} className="glass rounded-2xl p-5">
              <h3 className="font-semibold text-white">{c.title_mn || c.title}</h3>
              {c.plan_tier && (
                <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60 capitalize">
                  {c.plan_tier}
                </span>
              )}
              <p className="text-sm text-white/40 mt-2">
                {c.lessons?.[0]?.count ?? 0} хичээл
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
