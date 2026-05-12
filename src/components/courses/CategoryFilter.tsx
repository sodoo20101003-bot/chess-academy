'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { slug: '', label: 'Бүгд' },
  { slug: 'beginner', label: 'Эхлэгч' },
  { slug: 'intermediate', label: 'Дунд' },
  { slug: 'advanced', label: 'Ахисан' },
  { slug: 'openings', label: 'Нээлт' },
  { slug: 'middlegame', label: 'Дундын тоглоом' },
  { slug: 'endgame', label: 'Төгсгөл' },
  { slug: 'tactics', label: 'Тактик' },
  { slug: 'strategy', label: 'Стратеги' },
]

export function CategoryFilter({ active }: { active?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => {
        const isActive = (active ?? '') === cat.slug
        return (
          <Link
            key={cat.slug}
            href={cat.slug ? `/courses?category=${cat.slug}` : '/courses'}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all border',
              isActive
                ? 'bg-emerald-500 text-ink-950 border-emerald-500'
                : 'glass border-white/10 text-white/70 hover:text-white hover:border-white/30'
            )}
          >
            {cat.label}
          </Link>
        )
      })}
    </div>
  )
}
