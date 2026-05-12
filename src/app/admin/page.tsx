import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BookOpen, Users, DollarSign, TrendingUp, Plus, Calendar, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatMNT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Admin Dashboard (/admin)
 *
 * Шинэчилсэн: захиалга, багш нарын статистик нэмсэн.
 * Хүлээгдэж буй захиалга байвал tile дээр badge харагдана.
 */
export default async function AdminDashboard() {
  // Admin role-ийн шалгалт src/app/admin/layout.tsx дотор хийгдсэн гэж тооцно
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { count: studentCount },
    { count: lessonCount },
    { count: teacherCount },
    { count: pendingBookings },
    { data: recentPayments },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('lessons').select('*', { count: 'exact', head: true }),
    supabase.from('teacher_profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('payments')
      .select('amount_mnt, created_at, status')
      .eq('status', 'paid')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false }),
  ]);

  const totalRevenue = (recentPayments ?? []).reduce(
    (sum: number, p: any) => sum + (p.amount_mnt ?? 0),
    0
  );

  const stats = [
    { label: 'Нийт оюутан', value: String(studentCount ?? 0), icon: Users, color: 'emerald' as const },
    { label: 'Хичээл', value: String(lessonCount ?? 0), icon: BookOpen, color: 'emerald' as const },
    { label: 'Идэвхтэй багш', value: String(teacherCount ?? 0), icon: GraduationCap, color: 'gold' as const },
    { label: 'Орлого (30 хон.)', value: formatMNT(totalRevenue), icon: DollarSign, color: 'gold' as const },
  ];

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-medium">Admin Dashboard</h1>
          <p className="text-white/50 mt-2">Платформынхоо ажиллагааг хянах</p>
        </div>
        <Link href="/admin/lessons/new">
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            Шинэ хичээл
          </Button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="glass rounded-2xl p-6">
              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                s.color === 'emerald' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gold-500/15 text-gold-400'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-3xl font-display font-medium tabular-nums">
                {s.value}
              </div>
              <div className="text-xs uppercase tracking-wider text-white/40 mt-1">
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/admin/lessons" className="glass rounded-2xl p-6 hover:border-white/20 transition">
          <BookOpen className="w-5 h-5 text-emerald-400 mb-3" />
          <h3 className="text-xl font-semibold mb-2">Хичээлүүд</h3>
          <p className="text-sm text-white/50">Хичээл үүсгэх, засах, устгах</p>
        </Link>
        <Link href="/admin/courses" className="glass rounded-2xl p-6 hover:border-white/20 transition">
          <TrendingUp className="w-5 h-5 text-emerald-400 mb-3" />
          <h3 className="text-xl font-semibold mb-2">Курсууд</h3>
          <p className="text-sm text-white/50">Курс үүсгэх, засах</p>
        </Link>
        <Link href="/admin/teachers" className="glass rounded-2xl p-6 hover:border-white/20 transition">
          <GraduationCap className="w-5 h-5 text-emerald-400 mb-3" />
          <h3 className="text-xl font-semibold mb-2">Багш нар</h3>
          <p className="text-sm text-white/50">Багш нарын жагсаалт</p>
        </Link>
        <Link href="/admin/students" className="glass rounded-2xl p-6 hover:border-white/20 transition">
          <Users className="w-5 h-5 text-emerald-400 mb-3" />
          <h3 className="text-xl font-semibold mb-2">Сурагчид</h3>
          <p className="text-sm text-white/50">Гишүүдийн жагсаалт</p>
        </Link>
        <Link href="/admin/bookings" className="glass rounded-2xl p-6 hover:border-white/20 transition relative">
          <Calendar className="w-5 h-5 text-gold-400 mb-3" />
          <h3 className="text-xl font-semibold mb-2">Захиалгууд</h3>
          <p className="text-sm text-white/50">Багшийн цаг товлогдсон захиалга</p>
          {(pendingBookings ?? 0) > 0 && (
            <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-300 text-xs">
              {pendingBookings} шинэ
            </span>
          )}
        </Link>
        <Link href="/admin/payments" className="glass rounded-2xl p-6 hover:border-white/20 transition">
          <DollarSign className="w-5 h-5 text-gold-400 mb-3" />
          <h3 className="text-xl font-semibold mb-2">Төлбөрүүд</h3>
          <p className="text-sm text-white/50">QPay invoice, орлого</p>
        </Link>
      </div>
    </div>
  );
}
