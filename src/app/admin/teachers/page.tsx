import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * /admin/teachers — Багш нарын жагсаалт
 */
export default async function AdminTeachersPage() {
  const supabase = await createClient();

  const { data: teachers } = await supabase
    .from('teacher_profiles')
    .select('id, display_name, title_mn, rating, is_active, avatar_url, created_at')
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
        <h1 className="font-display text-4xl md:text-5xl font-medium">Багш нар</h1>
        <p className="text-white/50 mt-2">
          {teachers?.length ?? 0} багш бүртгэлтэй
        </p>
      </div>

      {!teachers || teachers.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 mb-4">Багш бүртгэгдээгүй байна.</p>
          <p className="text-white/40 text-sm">
            Багш нэмэхийн тулд хэрэглэгчийн role-ийг `teacher` болгоод <br />
            `teacher_profiles`-д бичлэг үүсгэнэ.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(teachers as any[]).map((t) => (
            <div key={t.id} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-ink-800 overflow-hidden shrink-0">
                  {t.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.avatar_url} alt={t.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
                      {(t.display_name || '?')[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate">{t.display_name}</h3>
                  {t.title_mn && (
                    <p className="text-xs text-emerald-400">{t.title_mn}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`px-2 py-0.5 rounded-full ${
                  t.is_active
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-white/5 text-white/40'
                }`}>
                  {t.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                </span>
                {t.rating && (
                  <span className="text-gold-400 tabular-nums">{t.rating} FIDE</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
