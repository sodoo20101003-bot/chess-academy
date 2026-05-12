import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveTier, type PlanTier } from '@/lib/plan-access';
import { Crown, BookOpen, GraduationCap, MessageCircle, Calendar, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * Сурагчийн хувийн dashboard.
 * userTier null байсан ч ажиллана — "Free" гэж харагдана.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/dashboard');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, subscription_tier, subscription_expires_at, plan_tier')
    .eq('id', user.id)
    .single();

  // Хуучин болон шинэ tier хоёрыг хоёуланг нь дэмжих
  const rawTier = (profile as any)?.plan_tier ?? (profile as any)?.subscription_tier ?? null;
  const userTier = getEffectiveTier(rawTier);

  // Tier-ийг нэрээр харуулах (null safe)
  const tierLabel = userTier
    ? userTier.charAt(0).toUpperCase() + userTier.slice(1)
    : 'Free';

  return (
    <div className="container mx-auto px-6 py-12 max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <p className="text-emerald-400 text-sm uppercase tracking-widest mb-3">
          Самбар
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-medium">
          Сайн уу, {(profile as any)?.full_name || 'найз'}!
        </h1>
      </div>

      {/* Membership card */}
      <div className="glass rounded-2xl p-6 mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-500/15 flex items-center justify-center">
            <Crown className="w-6 h-6 text-gold-400" />
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Гишүүнчлэл</p>
            <p className="font-medium text-white">
              {tierLabel}
            </p>
          </div>
        </div>
        {!userTier && (
          <Link
            href="/pricing"
            className="px-4 py-2 rounded-full bg-gold-400 text-ink-950 text-sm font-semibold hover:bg-gold-300 transition"
          >
            Plan авах
          </Link>
        )}
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashTile
          href="/lessons"
          icon={BookOpen}
          title="Хичээлүүд"
          description="Бүх хичээлийн жагсаалт"
        />
        <DashTile
          href="/teachers"
          icon={GraduationCap}
          title="Багш нар"
          description="Хувийн хичээл захиалах"
          locked={userTier !== 'pro' && userTier !== 'grandmaster'}
        />
        <DashTile
          href="/dashboard/bookings"
          icon={Calendar}
          title="Миний захиалга"
          description="Багштай товлосон цаг"
        />
      </div>
    </div>
  );
}

function DashTile({
  href,
  icon: Icon,
  title,
  description,
  locked = false,
}: {
  href: string;
  icon: any;
  title: string;
  description: string;
  locked?: boolean;
}) {
  return (
    <Link
      href={locked ? '/pricing' : href}
      className="glass rounded-2xl p-6 hover:border-white/20 transition group relative"
    >
      <Icon className="w-8 h-8 text-emerald-400 mb-3" />
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-sm text-white/50 mt-1">{description}</p>
      {locked && (
        <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-300">
          Plan
        </span>
      )}
    </Link>
  );
}
