'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { Chess, type Square } from 'chess.js'
import { CheckCircle2, XCircle, Lightbulb, RotateCcw, ArrowRight, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { play } from './sounds'

const Chessboard = dynamic(
  () => import('react-chessboard').then((m) => m.Chessboard),
  { ssr: false }
)

export interface Exercise {
  id: string
  type: 'find-best-move' | 'find-mate' | 'multiple-choice'
  fen: string
  prompt_mn: string
  solution: string | string[]   // UCI move (e.g. "e2e4") or sequence
  options?: { label_mn: string; value: string; correct: boolean }[]
  hint_mn?: string
  explanation_mn?: string
  points?: number
}

interface ExerciseWidgetProps {
  exercise: Exercise
  onComplete?: (result: { correct: boolean; hintsUsed: number; points: number }) => void
  className?: string
}

type Status = 'idle' | 'correct' | 'wrong' | 'revealed'

export function ExerciseWidget({ exercise, onComplete, className }: ExerciseWidgetProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [hintsUsed, setHintsUsed] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [game, setGame] = useState(() => {
    const g = new Chess()
    try { g.load(exercise.fen) } catch {}
    return g
  })

  const solutions = useMemo(
    () => Array.isArray(exercise.solution) ? exercise.solution : [exercise.solution],
    [exercise.solution]
  )

  const sideToMove = game.turn() === 'w' ? 'white' : 'black'

  const reset = useCallback(() => {
    const g = new Chess()
    try { g.load(exercise.fen) } catch {}
    setGame(g)
    setStatus('idle')
    setSelectedOption(null)
  }, [exercise.fen])

  const checkBoardMove = useCallback(
    (from: Square, to: Square): boolean => {
      if (status !== 'idle') return false

      const newGame = new Chess(game.fen())
      let move
      try {
        move = newGame.move({ from, to, promotion: 'q' })
      } catch {
        return false
      }
      if (!move) return false

      const uci = `${from}${to}${move.promotion ?? ''}`
      const isCorrect = solutions.includes(uci) || solutions.includes(move.san)

      setGame(newGame)

      if (isCorrect) {
        setStatus('correct')
        play(newGame.isCheckmate() ? 'checkmate' : newGame.inCheck() ? 'check' : move.captured ? 'capture' : 'move')
        const points = Math.max(0, (exercise.points ?? 10) - hintsUsed * 3)
        onComplete?.({ correct: true, hintsUsed, points })
      } else {
        setStatus('wrong')
        play('move')
      }

      return true
    },
    [game, status, solutions, exercise.points, hintsUsed, onComplete]
  )

  const checkMultipleChoice = useCallback(
    (value: string) => {
      if (status !== 'idle' || !exercise.options) return
      setSelectedOption(value)
      const option = exercise.options.find((o) => o.value === value)
      if (option?.correct) {
        setStatus('correct')
        const points = Math.max(0, (exercise.points ?? 10) - hintsUsed * 3)
        onComplete?.({ correct: true, hintsUsed, points })
      } else {
        setStatus('wrong')
      }
    },
    [status, exercise.options, exercise.points, hintsUsed, onComplete]
  )

  const useHint = useCallback(() => {
    setShowHint(true)
    setHintsUsed((h) => h + 1)
  }, [])

  const reveal = useCallback(() => {
    setStatus('revealed')
    onComplete?.({ correct: false, hintsUsed: hintsUsed + 1, points: 0 })
  }, [hintsUsed, onComplete])

  return (
    <div className={cn('glass-strong rounded-2xl p-6 border border-emerald-500/20', className)}>
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="flex-1">
          <p className="text-xs font-mono text-emerald-400 uppercase tracking-widest mb-1">
            Дасгал · {exercise.points ?? 10} оноо
          </p>
          <h3 className="font-display text-2xl text-white">
            {exercise.prompt_mn}
          </h3>
          <p className="text-sm text-white/50 mt-1">
            {sideToMove === 'white' ? 'Цагаан' : 'Хар'} нүүх ээлж
          </p>
        </div>

        {status !== 'idle' && (
          <button
            onClick={reset}
            className="text-white/50 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
            title="Дахин оролдох"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Chess board for find-best-move / find-mate */}
      {(exercise.type === 'find-best-move' || exercise.type === 'find-mate') && (
        <div className="max-w-md mx-auto rounded-xl overflow-hidden border border-white/10 mb-4">
          <Chessboard
            position={game.fen()}
            onPieceDrop={(from, to) => checkBoardMove(from as Square, to as Square)}
            boardOrientation={sideToMove}
            arePiecesDraggable={status === 'idle'}
            customDarkSquareStyle={{ backgroundColor: '#3a4a5c' }}
            customLightSquareStyle={{ backgroundColor: '#e8eef5' }}
            animationDuration={250}
          />
        </div>
      )}

      {/* Multiple choice options */}
      {exercise.type === 'multiple-choice' && exercise.options && (
        <div className="space-y-2 mb-4">
          {exercise.options.map((opt) => {
            const isSelected = selectedOption === opt.value
            const showCorrect = status !== 'idle' && opt.correct
            const showWrong = isSelected && status === 'wrong'
            return (
              <button
                key={opt.value}
                onClick={() => checkMultipleChoice(opt.value)}
                disabled={status !== 'idle'}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-xl border transition-all',
                  'disabled:cursor-not-allowed',
                  showCorrect && 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
                  showWrong && 'bg-red-500/20 border-red-500/50 text-red-300',
                  !showCorrect && !showWrong && 'glass border-white/10 text-white/80 hover:border-emerald-500/30'
                )}
              >
                <div className="flex items-center gap-3">
                  {showCorrect && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                  {showWrong && <XCircle className="w-5 h-5 flex-shrink-0" />}
                  <span>{opt.label_mn}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Hint */}
      <AnimatePresence>
        {showHint && exercise.hint_mn && status === 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex gap-3"
          >
            <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-100/90">{exercise.hint_mn}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status feedback */}
      <AnimatePresence>
        {status === 'correct' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-start gap-3 mb-4"
          >
            <Trophy className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-emerald-300">Зөв! Маш сайн.</p>
              {exercise.explanation_mn && (
                <p className="text-sm text-white/70 mt-1">{exercise.explanation_mn}</p>
              )}
              <p className="text-xs text-emerald-400/70 mt-2 font-mono">
                +{Math.max(0, (exercise.points ?? 10) - hintsUsed * 3)} оноо
              </p>
            </div>
          </motion.div>
        )}

        {status === 'wrong' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 mb-4"
          >
            <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-300">Тийм биш. Дахин оролдоорой.</p>
              <button
                onClick={reset}
                className="text-sm text-white/70 underline mt-2 hover:text-white"
              >
                Дахин оролдох
              </button>
            </div>
          </motion.div>
        )}

        {status === 'revealed' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4"
          >
            <p className="text-sm text-white/80 mb-2">
              <strong>Зөв хариулт:</strong> {solutions.join(' → ')}
            </p>
            {exercise.explanation_mn && (
              <p className="text-sm text-white/60">{exercise.explanation_mn}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      {status === 'idle' && (
        <div className="flex gap-2 flex-wrap">
          {exercise.hint_mn && !showHint && (
            <Button onClick={useHint} variant="outline" size="sm">
              <Lightbulb className="w-4 h-4 mr-1.5" />
              Зөвлөгөө (-3 оноо)
            </Button>
          )}
          <Button onClick={reveal} variant="ghost" size="sm">
            Хариулт харах
          </Button>
        </div>
      )}
    </div>
  )
}
