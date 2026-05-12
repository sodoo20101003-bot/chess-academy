import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccessLesson, TIER_LABEL_MN, type PlanTier } from '@/lib/plan-access';
import { Lock, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

/**
 * "Бүх хичээлүүд" хуудас (/lessons)
 *
 * Хичээлүүд зөвхөн plan tier-аар (basic/pro/grandmaster) бүлэгчилнэ.
 * Категори (Нээлт/Дундын тоглоом/Төгсгөл гэх мэт) шүүлтүүр алга — хэрэглэгч
 * өөрийн planд хамаарах хичээлийг л үзэх боломжтой, бусад нь түгжээтэй харагдана.
 */
export default async function LessonsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/lessons');
  }

  // Хэрэглэгчийн plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_tier, full_name')
    .eq('id', user.id)
    .single();

  const userTier = ((profile as any)?.plan_tier ?? null) as PlanTier | null;

  // Бүх хичээл, plan_tier-аар нь бүлэглэнэ
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, slug, title, title_mn, description_mn, plan_tier, is_free, thumbnail_url')
    .order('order_index', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  const grouped: Record<PlanTier, any[]> = {
    basic: [],
    pro: [],
    grandmaster: [],
  };
  for (const l of (lessons ?? []) as any[]) {
    const tier = (l.plan_tier ?? 'basic') as PlanTier;
    if (grouped[tier]) grouped[tier].push(l);
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-6xl">
      {/* Header */}
      <div className="mb-12">
        <p className="text-emerald-400 text-sm uppercase tracking-[0.2em] mb-3">
          Бүх хичээлүүд
        </p>
        <h1 className="font-display text-4xl md:text-6xl font-medium leading-tight">
          Шатрын <em className="text-gold-400 not-italic font-display">мастер</em> болох зам
        </h1>
        <p className="text-white/60 mt-4 max-w-2xl">
          Эхлэгчийн алхамаас гросмастерийн стратеги хүртэл — бид таныг бүх замд нь дагалдан явна.
        </p>

        {/* Хэрэглэгчийн plan-ийн badge */}
        {userTier ? (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-sm text-emerald-300">
              Таны plan: <strong>{TIER_LABEL_MN[userTier]}</strong>
            </span>
          </div>
        ) : (
          <div className="mt-6 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <Lock className="w-4 h-4 text-white/60" />
            <span className="text-sm text-white/70">
              Plan авч хичээлүүдийг үзээрэй
            </span>
            <Link href="/pricing" className="text-sm text-emerald-400 hover:text-emerald-300">
              Plan үзэх →
            </Link>
          </div>
        )}
      </div>

      {/* Plan tier бүрд тус секц */}
      <div className="space-y-16">
        {(['basic', 'pro', 'grandmaster'] as PlanTier[]).map((tier) => {
          const items = grouped[tier];
          const isUnlocked = canAccessLesson(userTier, tier);

          return (
            <section key={tier}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-3xl font-medium">
                    {TIER_LABEL_MN[tier]}
                  </h2>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      isUnlocked
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-white/5 text-white/40'
                    }`}
                  >
                    {items.length} хичээл
                  </span>
                </div>
                {!isUnlocked && (
                  <Link
                    href="/pricing"
                    className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Plan нээх
                  </Link>
                )}
              </div>

              {items.length === 0 ? (
                <p className="text-white/40 text-sm italic">
                  Энэ planд хичээл хараахан байхгүй байна.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((lesson: any) => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      unlocked={isUnlocked || lesson.is_free}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function LessonCard({
  lesson,
  unlocked,
}: {
  lesson: {
    id: string;
    slug: string;
    title: string;
    title_mn?: string | null;
    description_mn?: string | null;
    thumbnail_url?: string | null;
    is_free?: boolean;
  };
  unlocked: boolean;
}) {
  const title = lesson.title_mn || lesson.title;
  const href = unlocked ? `/lesson/${lesson.slug || lesson.id}` : '/pricing';

  return (
    <Link
      href={href}
      className="group glass rounded-2xl overflow-hidden hover:border-white/20 transition-all"
    >
      <div className="aspect-video bg-ink-800 relative overflow-hidden">
        {lesson.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lesson.thumbnail_url}
            alt={title}
            className={`w-full h-full object-cover transition-all ${
              unlocked ? 'group-hover:scale-105' : 'opacity-40 grayscale'
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20 text-5xl">
            ♟
          </div>
        )}
        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/60">
            <Lock className="w-8 h-8 text-white/70" />
          </div>
        )}
        {unlocked && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-ink-950/40">
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
              <Play className="w-5 h-5 text-ink-950 ml-0.5" />
            </div>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white truncate">{title}</h3>
        {lesson.description_mn && (
          <p className="text-sm text-white/50 mt-1 line-clamp-2">
            {lesson.description_mn}
          </p>
        )}
      </div>
    </Link>
  );
}
