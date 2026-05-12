'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface EvaluationBarProps {
  evaluation: number | null  // in pawn units, positive = white better
  mate: number | null
  orientation?: 'white' | 'black'
  className?: string
}

/**
 * Engine evaluation bar — белийн самбарын хажууд босоогоор гардаг.
 * Цагаан давуу үед цагаан хэсэг дээш гарна.
 */
export function EvaluationBar({ evaluation, mate, orientation = 'white', className }: EvaluationBarProps) {
  // Calculate white percentage (0-100)
  let whitePercent = 50
  let label = '0.0'

  if (mate !== null) {
    whitePercent = mate > 0 ? 100 : mate < 0 ? 0 : 50
    label = `M${Math.abs(mate)}`
  } else if (evaluation !== null) {
    // Sigmoid-like compression so big evals don't fully fill the bar
    const compressed = Math.tanh(evaluation / 4) * 50
    whitePercent = 50 + compressed
    label = (evaluation >= 0 ? '+' : '') + evaluation.toFixed(1)
  }

  // Flip if board is from black's perspective
  const displayWhitePercent = orientation === 'white' ? whitePercent : 100 - whitePercent

  return (
    <div className={cn('relative w-6 h-full rounded-md overflow-hidden border border-white/10 bg-ink-950', className)}>
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-white"
        animate={{ height: `${displayWhitePercent}%` }}
        transition={{ type: 'spring', stiffness: 100, damping: 25 }}
      />
      {/* Center marker */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-emerald-400/40" />

      {/* Label */}
      <div className={cn(
        'absolute left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold tracking-tight',
        displayWhitePercent > 50 ? 'bottom-1 text-ink-900' : 'top-1 text-white'
      )}>
        {label}
      </div>
    </div>
  )
}
