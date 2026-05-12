'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn, formatMNT } from '@/lib/utils'

interface Plan {
  id: string
  tier: string
  name_mn: string
  description_mn: string | null
  price_mnt: number
  billing_period: string
  features: string[] | null
  features_mn?: string[] | null
}

const TIER_META: Record<string, { tagline: string; popular?: boolean; gold?: boolean }> = {
  basic: { tagline: 'Шатарт орох эхний алхам' },
  pro: { tagline: 'Хамгийн алдартай сонголт', popular: true },
  grandmaster: { tagline: 'Мастер болохыг хүсэгчдэд', gold: true },
}

export function PricingTable({ plans }: { plans: Plan[] }) {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')

  const filtered = useMemo(
    () => plans.filter((p) => p.billing_period === period),
    [plans, period]
  )

  // Calculate yearly discount
  const monthlyPro = plans.find((p) => p.tier === 'pro' && p.billing_period === 'monthly')
  const yearlyPro = plans.find((p) => p.tier === 'pro' && p.billing_period === 'yearly')
  const yearlyDiscount = monthlyPro && yearlyPro
    ? Math.round((1 - yearlyPro.price_mnt / (monthlyPro.price_mnt * 12)) * 100)
    : 0

  return (
    <>
      <div className="flex justify-center mb-12">
        <div className="inline-flex glass border border-white/10 rounded-full p-1">
          {(['monthly', 'yearly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-6 py-2 rounded-full text-sm font-medium transition-all relative',
                period === p ? 'text-ink-950' : 'text-white/60 hover:text-white'
              )}
            >
              {period === p && (
                <motion.div
                  layoutId="period-pill"
                  className="absolute inset-0 bg-emerald-400 rounded-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative">
                {p === 'monthly' ? 'Сар бүр' : 'Жил бүр'}
                {p === 'yearly' && yearlyDiscount > 0 && (
                  <span className="ml-2 text-xs text-gold-500">−{yearlyDiscount}%</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {filtered.map((plan, idx) => {
          const meta = TIER_META[plan.tier] || {}
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                'relative rounded-2xl p-8 border',
                meta.popular
                  ? 'glass-strong border-emerald-500/40 shadow-2xl shadow-emerald-500/10'
                  : meta.gold
                  ? 'glass border-gold-500/30'
                  : 'glass border-white/10'
              )}
            >
              {meta.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-400 to-emerald-500 text-ink-950 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Хамгийн түгээмэл
                  </span>
                </div>
              )}

              <h3 className={cn(
                'font-display text-3xl mb-2',
                meta.gold ? 'text-gold-400' : 'text-white'
              )}>
                {plan.name_mn}
              </h3>
              {meta.tagline && (
                <p className="text-sm text-white/50 mb-6">{meta.tagline}</p>
              )}

              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-5xl text-white">
                    {formatMNT(plan.price_mnt)}
                  </span>
                </div>
                <p className="text-sm text-white/50 mt-1">
                  / {period === 'monthly' ? 'сар' : 'жил'}
                </p>
              </div>

              <Link href={`/pricing/${plan.id}`}>
                <Button
                  variant={meta.gold ? 'gold' : meta.popular ? 'primary' : 'outline'}
                  size="lg"
                  className="w-full mb-8"
                >
                  Сонгох
                </Button>
              </Link>

              <ul className="space-y-3">
                {(plan.features ?? plan.features_mn ?? []).map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Check className={cn(
                      'w-5 h-5 flex-shrink-0 mt-0.5',
                      meta.gold ? 'text-gold-400' : 'text-emerald-400'
                    )} />
                    <span className="text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )
        })}
      </div>
    </>
  )
}
