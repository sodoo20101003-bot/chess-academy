import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Users,
  Calendar,
  DollarSign,
  Folder,
  Home,
  LogOut,
  Crown,
} from 'lucide-react';

/**
 * /admin/* бүх хуудаст хамаатай server-side guard + sidebar layout.
 *
 * Зүүн талд navigation menu, доор profile харагдана.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/admin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role')
    .eq('id', user.id)
    .single();

  const p = profile as any;

  // Зөвхөн admin эсвэл teacher эрхтэй хэрэглэгч admin panel-руу нэвтэрнэ
  if (!p || (p.role !== 'admin' && p.role !== 'teacher')) {
    redirect('/dashboard');
  }

  const initial = (p.full_name || 'A').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-ink-950 flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-white/10 bg-ink-900/50 flex flex-col sticky top-0 h-screen">
        {/* Logo */}
        <Link href="/admin" className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <Crown className="w-6 h-6 text-gold-400" />
          <div>
            <div className="font-display text-lg leading-tight">Admin</div>
            <div className="text-xs text-white/40 leading-tight">GrandMaster.mn</div>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLink href="/admin" icon={LayoutDashboard}>Хяналтын самбар</NavLink>
          <NavLink href="/admin/lessons" icon={BookOpen}>Хичээлүүд</NavLink>
          <NavLink href="/admin/courses" icon={Folder}>Курсууд</NavLink>
          <NavLink href="/admin/teachers" icon={GraduationCap}>Багш нар</NavLink>
          <NavLink href="/admin/students" icon={Users}>Сурагчид</NavLink>
          <NavLink href="/admin/bookings" icon={Calendar}>Захиалгууд</NavLink>
          <NavLink href="/admin/payments" icon={DollarSign}>Төлбөрүүд</NavLink>
        </nav>

        {/* Profile + actions footer */}
        <div className="border-t border-white/10 p-3 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
          >
            <Home className="w-4 h-4" />
            Гол хуудас
          </Link>

          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/40 to-gold-500/40 flex items-center justify-center overflow-hidden shrink-0">
              {p.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-semibold">{initial}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {p.full_name || 'Admin'}
              </div>
              <div className="text-xs text-emerald-400 capitalize">{p.role}</div>
            </div>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/60 hover:text-red-300 hover:bg-red-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
              Гарах
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}
