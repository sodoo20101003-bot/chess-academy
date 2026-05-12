'use client'

import type { Move } from 'chess.js'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface CapturedPiecesProps {
  history: Move[]
  upToIndex: number  // -1 = no moves played, 0 = first move played
  side: 'white' | 'black'
  className?: string
}

const PIECE_VALUE: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
}

const PIECE_GLYPH: Record<string, { white: string; black: string }> = {
  p: { white: '♙', black: '♟' },
  n: { white: '♘', black: '♞' },
  b: { white: '♗', black: '♝' },
  r: { white: '♖', black: '♜' },
  q: { white: '♕', black: '♛' },
}

const ORDER = ['p', 'n', 'b', 'r', 'q'] as const

export function CapturedPieces({ history, upToIndex, side, className }: CapturedPiecesProps) {
  const { captured, advantage } = useMemo(() => {
    const captured: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 }
    let whiteCapturedValue = 0  // value of black pieces white has captured
    let blackCapturedValue = 0  // value of white pieces black has captured

    for (let i = 0; i <= upToIndex && i < history.length; i++) {
      const move = history[i]
      if (!move.captured) continue

      // move.color is the mover; captured piece is opposite color
      const capturedColor = move.color === 'w' ? 'b' : 'w'

      // We're showing "pieces captured BY this side"
      // i.e. pieces of the opposite color that were captured
      const showHere =
        (side === 'white' && capturedColor === 'b') ||
        (side === 'black' && capturedColor === 'w')

      if (showHere) {
        captured[move.captured] = (captured[move.captured] ?? 0) + 1
      }

      if (move.color === 'w') whiteCapturedValue += PIECE_VALUE[move.captured] ?? 0
      else blackCapturedValue += PIECE_VALUE[move.captured] ?? 0
    }

    const adv = side === 'white'
      ? whiteCapturedValue - blackCapturedValue
      : blackCapturedValue - whiteCapturedValue

    return { captured, advantage: adv }
  }, [history, upToIndex, side])

  const totalCaptured = Object.values(captured).reduce((a, b) => a + b, 0)
  if (totalCaptured === 0 && advantage <= 0) {
    return <div className={cn('h-6', className)} />
  }

  return (
    <div className={cn('flex items-center gap-1 h-6', className)}>
      {ORDER.map((piece) => {
        const count = captured[piece]
        if (!count) return null
        const glyph = PIECE_GLYPH[piece][side === 'white' ? 'black' : 'white']
        return (
          <div key={piece} className="flex items-center">
            {Array.from({ length: count }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'text-lg leading-none',
                  side === 'white' ? 'text-white/80' : 'text-ink-900',
                  i > 0 && '-ml-2'
                )}
              >
                {glyph}
              </span>
            ))}
          </div>
        )
      })}
      {advantage > 0 && (
        <span className="ml-2 text-xs font-mono text-emerald-400">+{advantage}</span>
      )}
    </div>
  )
}
