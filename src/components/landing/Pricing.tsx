'use client';

import { motion } from 'framer-motion';
import { Check, Crown, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { formatMNT } from '@/lib/utils';
import { useState } from 'react';

const plans = [
  {
    id: 'free',
    name: 'Үнэгүй',
    price: 0,
    yearlyPrice: 0,
    description: 'Шатартай танилцах',
    icon: null,
    features: [
      'Анхан шатны 5 хичээл',
      'Өдрийн 1 оньсого',
      'Прогресс хадгалах',
      'Community хандах',
    ],
    cta: 'Эхлэх',
    href: '/auth/signup',
    highlight: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 29000,
    yearlyPrice: 290000,
    description: 'Жирийн суралцагчдад',
    icon: Zap,
    features: [
      'Бүх анхан шатны хичээл',
      'Өдрийн 5 оньсого',
      'Хичээлийн материал татах',
      'Багшийн комментар',
      'Mobile app',
    ],
    cta: 'Сонгох',
    href: '/pricing/basic',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 59000,
    yearlyPrice: 590000,
    description: 'Хамгийн алдартай',
    icon: Sparkles,
    features: [
      'Бүх Basic feature',
      'Дунд + ахисан хичээл',
      'AI engine analysis',
      'Хязгааргүй оньсого',
      'Tournament оролцоо',
      'Priority багш дэмжлэг',
    ],
    cta: 'Сонгох',
    href: '/pricing/pro',
    highlight: true,
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    price: 99000,
    yearlyPrice: 990000,
    description: 'Хамгийн дээд төвшин',
    icon: Crown,
    features: [
      'Бүх Pro feature',
      'Сар бүр 2 цаг 1-on-1',
      'Хувийн training plan',
      'Direct WhatsApp багштай',
      'Exclusive content',
      'GM-ээс эрхтэй гарын авлага',
    ],
    cta: 'Сонгох',
    href: '/pricing/grandmaster',
    highlight: false,
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="relative py-32 overflow-hidden">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-block mb-4 text-xs uppercase tracking-[0.2em] text-emerald-400 font-medium">
              Үнийн төлөвлөгөө
            </div>
            <h2 className="font-display text-5xl md:text-7xl font-medium tracking-tight">
              Танд тохирсон <span className="gradient-text italic">төлөвлөгөө</span>
            </h2>
            <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto">
              Хэдийд ч цуцалж болно. Эхний 7 хоног мөнгө буцаалттай.
            </p>
          </motion.div>

          {/* Toggle */}
          <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.02] p-1.5">
            <button
              onClick={() => setYearly(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                !yearly ? 'bg-white/10 text-white' : 'text-white/50'
              }`}
            >
              Сараар
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                yearly ? 'bg-white/10 text-white' : 'text-white/50'
              }`}
            >
              Жилээр
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
                -17%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const price = yearly ? plan.yearlyPrice : plan.price;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative ${plan.highlight ? 'lg:-mt-4 lg:mb-4' : ''}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-950">
                      Хамгийн алдартай
                    </div>
                  </div>
                )}

                <div
                  className={`relative h-full rounded-3xl p-8 transition-all duration-300 ${
                    plan.highlight
                      ? 'glass-strong border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.15)]'
                      : 'glass hover:border-white/20'
                  }`}
                >
                  {/* Icon */}
                  {Icon && (
                    <div className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl ${
                      plan.id === 'grandmaster'
                        ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-ink-950'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  )}

                  {/* Name */}
                  <h3 className="text-2xl font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-white/50">{plan.description}</p>

                  {/* Price */}
                  <div className="mt-6 mb-8">
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-5xl font-medium tabular-nums">
                        {price === 0 ? '0' : formatMNT(price).replace('₮', '')}
                      </span>
                      <span className="text-white/40">₮</span>
                    </div>
                    <div className="mt-1 text-xs text-white/40">
                      {price === 0 ? 'үргэлж' : `/${yearly ? 'жил' : 'сар'}`}
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-3 text-sm">
                        <Check className={`h-4 w-4 mt-0.5 shrink-0 ${
                          plan.highlight ? 'text-emerald-400' : 'text-white/60'
                        }`} />
                        <span className="text-white/80">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link href={plan.href} className="block">
                    <Button
                      variant={plan.highlight ? 'primary' : 'outline'}
                      className="w-full"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
