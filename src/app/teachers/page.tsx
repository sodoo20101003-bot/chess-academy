import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canBookTeacher, type PlanTier } from '@/lib/plan-access';
import { Lock, Calendar, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

/**
 * Багш нарын жагсаалт (/teachers)
 *
 * Зөвхөн pro/grandmaster planтай хэрэглэгч багштай цаг товлож чадна.
 * Basic plan-тай хэрэглэгчид upgrade хийх CTA харагдана.
 */
export default async function TeachersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/teachers');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_tier')
    .eq('id', user.id)
    .single();

  const userTier = ((profile as any)?.plan_tier ?? null) as PlanTier | null;
  const canBook = canBookTeacher(userTier);

  const { data: teachers } = await supabase
    .from('teacher_profiles')
    .select('id, display_name, title_mn, bio_mn, rating, avatar_url')
    .eq('is_active', true)
    .order('rating', { ascending: false, nullsFirst: false });

  return (
    <div className="container mx-auto px-6 py-12 max-w-6xl">
      <div className="mb-10">
        <p className="text-emerald-400 text-sm uppercase tracking-[0.2em] mb-3">
          Багш нар
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-medium">
          Бидний багш нар
        </h1>
        <p className="text-white/60 mt-3 max-w-2xl">
          Олон улсын мастер, гросмастер багш нараас хувийн хичээл аваарай.
        </p>
      </div>

      {!canBook && (
        <div className="mb-8 rounded-2xl bg-gold-500/10 border border-gold-500/30 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-gold-400 shrink-0" />
            <div>
              <p className="text-white font-medium">
                Багш захиалахын тулд Pro эсвэл Grandmaster planтай байх ёстой
              </p>
              <p className="text-sm text-white/60 mt-1">
                Plan дээшлүүлж хувийн хичээл аваарай
              </p>
            </div>
          </div>
          <Link href="/pricing">
            <Button variant="primary">Plan үзэх</Button>
          </Link>
        </div>
      )}

      {!teachers || teachers.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-white/50">Одоогоор багш бүртгэгдээгүй байна.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(teachers as any[]).map((t) => (
            <div key={t.id} className="glass rounded-2xl p-5 flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-ink-800 overflow-hidden shrink-0">
                  {t.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.avatar_url} alt={t.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl text-white/30">
                      ♟
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate">{t.display_name}</h3>
                  {t.title_mn && (
                    <p className="text-xs text-emerald-400">{t.title_mn}</p>
                  )}
                  {t.rating && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gold-400">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{t.rating} FIDE</span>
                    </div>
                  )}
                </div>
              </div>
              {t.bio_mn && (
                <p className="text-sm text-white/60 line-clamp-3 mb-4 flex-1">
                  {t.bio_mn}
                </p>
              )}
              <Link href={`/teachers/${t.id}`} className="mt-auto">
                <Button variant={canBook ? 'primary' : 'outline'} className="w-full">
                  <Calendar className="w-4 h-4" />
                  {canBook ? 'Цаг товлох' : 'Танилцах'}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
