'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard`,
      },
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    setDone(true);
    toast.success('Бүртгэл амжилттай! И-мэйлээ шалгана уу.');
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-strong rounded-3xl p-10 max-w-md text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="font-display text-3xl mb-3">И-мэйлээ шалгана уу</h1>
          <p className="text-white/60 mb-6">
            <span className="text-emerald-400">{form.email}</span> хаягт баталгаажуулах холбоос явууллаа.
          </p>
          <Link href="/auth/login">
            <Button variant="outline" className="w-full">Нэвтрэх хуудас руу</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-grid-pattern">
      <div className="absolute inset-0 bg-radial-emerald pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <Link href="/" className="flex items-center gap-2 justify-center mb-10">
          <span className="text-3xl">♞</span>
          <span className="font-display text-2xl font-semibold">GrandMaster.mn</span>
        </Link>

        <div className="glass-strong rounded-3xl p-8 md:p-10">
          <h1 className="font-display text-4xl font-medium mb-2">
            Шатрын аялал <span className="gradient-text italic">эхэлж</span> байна
          </h1>
          <p className="text-white/50 mb-8">Үнэгүй данс үүсгээд эхний 5 хичээл аваарай</p>

          <button
            onClick={handleGoogle}
            className="w-full h-12 rounded-xl bg-white text-ink-950 font-medium flex items-center justify-center gap-3 hover:bg-white/90 transition mb-6"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google-ээр бүртгүүлэх
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs uppercase tracking-wider text-white/40">эсвэл</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Нэр</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                placeholder="Бат Очир"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">И-мэйл</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Нууц үг</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                placeholder="Доод тал нь 6 тэмдэгт"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full h-12" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Бүртгүүлэх
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-white/50">
            Бүртгэлтэй юу?{' '}
            <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Нэвтрэх
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
