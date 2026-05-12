'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ChessBackground } from './ChessBackground';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden min-h-[100svh] flex items-center">
      {/* Background animation */}
      <ChessBackground />

      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-radial-emerald" />

      {/* Grid texture */}
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />

      <div className="container relative z-10 mx-auto px-6 py-32">
        <div className="mx-auto max-w-5xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-300 backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Монголын анхны премиум шатрын академи
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-6xl md:text-8xl lg:text-9xl font-medium leading-[0.95] tracking-tight"
          >
            <span className="block">Шатрын</span>
            <span className="gradient-text italic">мастер болох</span>
            <span className="block text-white/40 text-4xl md:text-5xl lg:text-6xl mt-4 font-sans font-normal not-italic tracking-tight">
              эхний алхам — энд
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mx-auto mt-10 max-w-2xl text-lg md:text-xl text-white/60 leading-relaxed"
          >
            Их мастер багш нараас интерактив хичээл, өдөр бүрийн оньсого, AI шинжилгээтэй
            <br className="hidden md:block" />
            <span className="text-emerald-400"> 1,200+ оюутан</span> аль хэдийн суралцаж байна.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/auth/signup">
              <Button size="xl" variant="primary">
                Үнэгүй эхлэх
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/courses">
              <Button size="xl" variant="outline">
                Хичээл үзэх
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="mt-20 grid grid-cols-3 gap-4 max-w-2xl mx-auto"
          >
            {[
              { value: '120+', label: 'Хичээл' },
              { value: '1,200+', label: 'Оюутан' },
              { value: '4.9★', label: 'Үнэлгээ' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-4xl md:text-5xl font-medium text-white">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs uppercase tracking-widest text-white/40">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink-950 to-transparent" />
    </section>
  );
}
