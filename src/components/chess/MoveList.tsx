'use client'

import type { Move } from 'chess.js'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface MoveListProps {
  history: Move[]
  currentIndex: number
  onSelect: (index: number) => void
  className?: string
}

export function MoveList({ history, currentIndex, onSelect, className }: MoveListProps) {
  const activeRef = useRef<HTMLButtonElement>(null)

  // Auto-scroll active move into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentIndex])

  if (history.length === 0) {
    return (
      <div className={cn('glass rounded-xl p-6 text-center', className)}>
        <p className="text-sm text-white/40">Нүүдэл бүртгэгдээгүй</p>
      </div>
    )
  }

  const pairs: Array<{ white: Move; black?: Move; whiteIdx: number; blackIdx: number }> = []
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({
      white: history[i],
      black: history[i + 1],
      whiteIdx: i,
      blackIdx: i + 1,
    })
  }

  return (
    <div className={cn('glass rounded-xl p-4 overflow-y-auto', className)}>
      <div className="text-xs uppercase tracking-wider text-white/40 mb-3 font-mono">
        Нүүдлүүд
      </div>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 text-sm font-mono">
        {pairs.map((pair, i) => (
          <div key={i} className="contents">
            <span className="text-white/30 self-center">{i + 1}.</span>

            <button
              ref={currentIndex === pair.whiteIdx ? activeRef : null}
              onClick={() => onSelect(pair.whiteIdx)}
              className={cn(
                'text-left px-2 py-1 rounded transition-colors',
                currentIndex === pair.whiteIdx
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                  : 'text-white/80 hover:bg-white/5'
              )}
            >
              {pair.white.san}
              {pair.white.captured && <span className="text-rose-400/60 ml-1">×</span>}
            </button>

            {pair.black ? (
              <button
                ref={currentIndex === pair.blackIdx ? activeRef : null}
                onClick={() => onSelect(pair.blackIdx)}
                className={cn(
                  'text-left px-2 py-1 rounded transition-colors',
                  currentIndex === pair.blackIdx
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'text-white/80 hover:bg-white/5'
                )}
              >
                {pair.black.san}
                {pair.black.captured && <span className="text-rose-400/60 ml-1">×</span>}
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
