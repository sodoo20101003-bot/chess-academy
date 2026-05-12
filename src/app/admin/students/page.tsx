import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, Users } from 'lucide-react';
import { TIER_LABEL_MN, type PlanTier } from '@/lib/plan-access';

export const dynamic = 'force-dynamic';

/**
 * /admin/students — Сурагчдын жагсаалт
 *
 * Admin layout-р дамжин хамгаалагдсан.
 */
export default async function AdminStudentsPage() {
  const supabase = await createClient();

  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, email, plan_tier, role, created_at, avatar_url')
    .eq('role', 'student')
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
        <h1 className="font-display text-4xl md:text-5xl font-medium">Сурагчид</h1>
        <p className="text-white/50 mt-2">
          Бүртгэлтэй <strong className="text-white">{students?.length ?? 0}</strong> сурагч
        </p>
      </div>

      {!students || students.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">Сурагч бүртгэгдээгүй байна.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-white/40 font-normal">Сурагч</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-white/40 font-normal">Email</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-white/40 font-normal">Plan</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-white/40 font-normal">Бүртгүүлсэн</th>
                </tr>
              </thead>
              <tbody>
                {(students as any[]).map((s) => {
                  const tier = (s.plan_tier ?? null) as PlanTier | null;
                  return (
                    <tr key={s.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-ink-800 overflow-hidden shrink-0">
                            {s.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.avatar_url} alt={s.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
                                {(s.full_name || '?')[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="font-medium">{s.full_name || 'Нэргүй'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/60">{s.email}</td>
                      <td className="px-4 py-3">
                        {tier ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            tier === 'grandmaster'
                              ? 'bg-gold-500/20 text-gold-300'
                              : tier === 'pro'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-white/10 text-white/70'
                          }`}>
                            {TIER_LABEL_MN[tier]}
                          </span>
                        ) : (
                          <span className="text-white/30 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs tabular-nums">
                        {new Date(s.created_at).toLocaleDateString('mn-MN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
