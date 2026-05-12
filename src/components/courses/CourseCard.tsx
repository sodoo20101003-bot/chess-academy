'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Lock, BookOpen, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIER_LABEL: Record<string, string> = {
  free: 'Үнэгүй',
  basic: 'Basic',
  pro: 'Pro',
  grandmaster: 'Grandmaster',
}

const TIER_COLOR: Record<string, string> = {
  free: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  basic: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  pro: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  grandmaster: 'bg-gold-500/20 text-gold-300 border-gold-500/30',
}

const CATEGORY_LABEL: Record<string, string> = {
  beginner: 'Эхлэгч',
  intermediate: 'Дунд',
  advanced: 'Ахисан',
  openings: 'Нээлт',
  middlegame: 'Дундын тоглоом',
  endgame: 'Төгсгөл',
  tactics: 'Тактик',
  strategy: 'Стратеги',
}

interface CourseCardProps {
  course: {
    id: string
    slug: string
    title_mn: string
    description_mn: string | null
    cover_image_url: string | null
    category: string
    required_tier: string
    lessons?: { count: number }[]
    duration_minutes?: number | null
  }
}

export function CourseCard({ course }: CourseCardProps) {
  const lessonCount = course.lessons?.[0]?.count ?? 0
  const isPremium = course.required_tier !== 'free'

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <Link
        href={`/courses/${course.slug}`}
        className="group block relative overflow-hidden rounded-2xl glass border border-white/10 hover:border-emerald-500/40 transition-colors"
      >
        <div className="aspect-[16/10] relative overflow-hidden bg-gradient-to-br from-ink-800 to-ink-900">
          {course.cover_image_url ? (
            <Image
              src={course.cover_image_url}
              alt={course.title_mn}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-7xl text-white/5">♞</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />

          <div className="absolute top-4 left-4 flex gap-2">
            <span className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-md',
              TIER_COLOR[course.required_tier] || TIER_COLOR.free
            )}>
              {isPremium && <Lock className="inline w-3 h-3 mr-1" />}
              {TIER_LABEL[course.required_tier]}
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-xs font-mono text-emerald-400 uppercase tracking-widest mb-1">
              {CATEGORY_LABEL[course.category] || course.category}
            </p>
          </div>
        </div>

        <div className="p-6">
          <h3 className="font-display text-2xl text-white mb-2 group-hover:text-emerald-300 transition-colors">
            {course.title_mn}
          </h3>
          {course.description_mn && (
            <p className="text-sm text-white/60 line-clamp-2 mb-4">
              {course.description_mn}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {lessonCount} хичээл
            </span>
            {course.duration_minutes && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {Math.round(course.duration_minutes / 60)} цаг
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
