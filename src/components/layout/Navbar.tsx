'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, User, Settings, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const navLinks = [
  { href: '/courses', label: 'Хичээлүүд' },
  { href: '/puzzles', label: 'Оньсого' },
  { href: '/leaderboard', label: 'Чансаа' },
  { href: '/#pricing', label: 'Үнэ' },
];

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase
          .from('profiles')
          .select('full_name, avatar_url, role')
          .eq('id', user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from('profiles')
          .select('full_name, avatar_url, role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setDropdownOpen(false);
    setUser(null);
    setProfile(null);
    router.push('/');
    router.refresh();
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Хэрэглэгч';
  const avatarUrl = profile?.avatar_url;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'teacher';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-white/5 bg-ink-950/70 backdrop-blur-xl'
          : 'border-b border-transparent'
      }`}
    >
      <nav className="container mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/logo-icon.svg"
            alt=""
            width={24}
            height={24}
            className="text-white group-hover:text-emerald-400 transition-colors"
            priority
          />
          <span className="font-display text-xl font-medium tracking-tight text-white group-hover:text-emerald-400 transition-colors">
            GrandMaster<span className="italic font-light text-white/50 group-hover:text-emerald-400/70">.mn</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth section */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            /* Нэвтэрсэн хэрэглэгч — Avatar + Dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors group"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-500/50 group-hover:border-emerald-400 transition-colors flex-shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-emerald-900/50 flex items-center justify-center">
                      <User className="w-4 h-4 text-emerald-400" />
                    </div>
                  )}
                </div>
                <span className="text-sm text-white/80 group-hover:text-white max-w-[120px] truncate">
                  {displayName}
                </span>
                <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/10 bg-ink-950/95 backdrop-blur-xl shadow-2xl overflow-hidden"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-500/30 flex-shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-emerald-900/50 flex items-center justify-center">
                              <User className="w-5 h-5 text-emerald-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{displayName}</p>
                          <p className="text-xs text-white/40 truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-2">
                      <Link
                        href="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Хяналтын самбар
                      </Link>
                      <Link
                        href="/account"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Тохиргоо
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          Админ панел
                        </Link>
                      )}
                    </div>

                    <div className="p-2 border-t border-white/5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Гарах
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* Нэвтрээгүй — Нэвтрэх / Эхлэх */
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Нэвтрэх
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="primary" size="sm">
                  Эхлэх
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-white p-2"
          aria-label="menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/5 bg-ink-950/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="container mx-auto px-6 py-6 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-white/5 mt-4">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-500/30">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-emerald-900/50 flex items-center justify-center">
                            <User className="w-5 h-5 text-emerald-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{displayName}</p>
                        <p className="text-xs text-white/40">{user.email}</p>
                      </div>
                    </div>
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full">Хяналтын самбар</Button>
                    </Link>
                    <Link href="/account" onClick={() => setMobileOpen(false)}>
                      <Button variant="ghost" className="w-full">Тохиргоо</Button>
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setMobileOpen(false); }}
                      className="w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 rounded-lg hover:bg-red-900/20 transition-colors"
                    >
                      Гарах
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login">
                      <Button variant="outline" className="w-full">Нэвтрэх</Button>
                    </Link>
                    <Link href="/auth/signup">
                      <Button variant="primary" className="w-full">Эхлэх</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
