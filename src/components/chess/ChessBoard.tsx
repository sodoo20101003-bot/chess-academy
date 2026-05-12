'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { Square } from 'chess.js'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  Play, Pause, RotateCcw, Lightbulb, FlipVertical2,
  Volume2, VolumeX, Brain, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChessGame } from './useChessGame'
import { useStockfish } from './useStockfish'
import { MoveList } from './MoveList'
import { CapturedPieces } from './CapturedPieces'
import { EvaluationBar } from './EvaluationBar'

// react-chessboard is ssr-incompatible, lazy-load
const Chessboard = dynamic(
  () => import('react-chessboard').then((m) => m.Chessboard),
  { ssr: false, loading: () => <BoardSkeleton /> }
)

export interface LessonAnnotation {
  moveIndex: number
  comment_mn?: string
  arrows?: Array<[string, string]>   // pairs of squares (e.g. ['e2', 'e4'])
  highlights?: string[]              // squares (e.g. ['e4', 'd5'])
  evaluation?: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'brilliant'
}

interface ChessBoardProps {
  initialFen?: string
  pgn?: string
  annotations?: LessonAnnotation[]
  interactive?: boolean
  orientation?: 'white' | 'black'
  showEngine?: boolean
  showMoveList?: boolean
  showCapturedPieces?: boolean
  enableHints?: boolean
  enableSound?: boolean
  className?: string
  onMoveIndexChange?: (index: number) => void
}

const EVAL_BADGE: Record<NonNullable<LessonAnnotation['evaluation']>, { icon: string; label: string; color: string }> = {
  brilliant: { icon: '!!', label: 'Гайхалтай', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  best: { icon: '!', label: 'Шилдэг', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  good: { icon: '✓', label: 'Сайн', color: 'bg-emerald-500/10 text-emerald-300/80 border-emerald-500/20' },
  inaccuracy: { icon: '?!', label: 'Алдаатай', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  mistake: { icon: '?', label: 'Алдаа', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  blunder: { icon: '??', label: 'Том алдаа', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
}

export function ChessBoard({
  initialFen,
  pgn,
  annotations = [],
  interactive = true,
  orientation: initialOrientation = 'white',
  showEngine = false,
  showMoveList = true,
  showCapturedPieces = true,
  enableHints = true,
  enableSound = true,
  className,
  onMoveIndexChange,
}: ChessBoardProps) {
  const [orientation, setOrientation] = useState(initialOrientation)
  const [soundOn, setSoundOn] = useState(enableSound)
  const [hintSquare, setHintSquare] = useState<Square | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(showEngine)
  const [showHintArrow, setShowHintArrow] = useState(false)

  const game = useChessGame({
    initialFen,
    pgn,
    enableSound: soundOn,
    onMoveIndexChange,
  })

  const engine = useStockfish({ enabled: showAnalysis })

  // Auto-analyze position when engine is on and position changes
  useEffect(() => {
    if (showAnalysis && game.fen) {
      engine.analyze(game.fen, { depth: 14 })
    }
  }, [showAnalysis, game.fen, engine])

  // Current annotation matching this move
  const currentAnnotation = useMemo(
    () => annotations.find((a) => a.moveIndex === game.moveIndex),
    [annotations, game.moveIndex]
  )

  // Last move for highlighting
  const lastMove = useMemo(() => {
    if (!game.isLessonMode || game.moveIndex < 0) return null
    return game.moveHistory[game.moveIndex]
  }, [game.isLessonMode, game.moveHistory, game.moveIndex])

  // Build customSquareStyles
  const customSquareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const styles: Record<string, React.CSSProperties> = {}

    // Last move highlight
    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: 'rgba(52, 211, 153, 0.35)' }
      styles[lastMove.to] = { backgroundColor: 'rgba(52, 211, 153, 0.45)' }
    }

    // Annotation highlights
    if (currentAnnotation?.highlights) {
      for (const sq of currentAnnotation.highlights) {
        styles[sq] = { backgroundColor: 'rgba(245, 217, 122, 0.4)' }
      }
    }

    // Hint dots — show legal moves from selected square
    if (hintSquare && interactive && !pgn) {
      const moves = game.getLegalMoves(hintSquare)
      for (const m of moves) {
        styles[m.to] = {
          ...styles[m.to],
          background: m.captured
            ? 'radial-gradient(circle, transparent 60%, rgba(244, 63, 94, 0.4) 60%)'
            : 'radial-gradient(circle, rgba(52, 211, 153, 0.4) 22%, transparent 22%)',
        }
      }
      styles[hintSquare] = {
        ...styles[hintSquare],
        backgroundColor: 'rgba(52, 211, 153, 0.3)',
      }
    }

    // In-check king square
    if (game.gameResult === 'in-check' || game.gameResult === 'checkmate') {
      // King is at... we'd need to compute. For simplicity, use a CSS class via piece styling.
    }

    return styles
  }, [lastMove, currentAnnotation, hintSquare, interactive, pgn, game])

  // Build custom arrows (annotation arrows + engine hint)
  const customArrows = useMemo<Array<[Square, Square, string?]>>(() => {
    const arrows: Array<[Square, Square, string?]> = []

    if (currentAnnotation?.arrows) {
      for (const [from, to] of currentAnnotation.arrows) {
        arrows.push([from as Square, to as Square, '#34d399'])
      }
    }

    if (showHintArrow && engine.bestMove && engine.bestMove.length >= 4) {
      const from = engine.bestMove.slice(0, 2) as Square
      const to = engine.bestMove.slice(2, 4) as Square
      arrows.push([from, to, '#f5d97a'])
    }

    return arrows
  }, [currentAnnotation, showHintArrow, engine.bestMove])

  // Handle piece move
  const onPieceDrop = useCallback(
    (from: Square, to: Square): boolean => {
      if (!interactive || pgn) return false
      const move = game.attemptMove(from, to)
      setHintSquare(null)
      return move !== null
    },
    [interactive, pgn, game]
  )

  // Handle square click for hint dots
  const onSquareClick = useCallback(
    (square: Square) => {
      if (!enableHints || !interactive || pgn) return
      if (hintSquare === square) {
        setHintSquare(null)
        return
      }
      setHintSquare(square)
    },
    [enableHints, interactive, pgn, hintSquare]
  )

  const showHint = useCallback(() => {
    if (!engine.bestMove) {
      // Trigger analysis if not yet on
      if (!showAnalysis) {
        setShowAnalysis(true)
        engine.analyze(game.fen, { movetime: 1500 })
      }
    }
    setShowHintArrow(true)
    setTimeout(() => setShowHintArrow(false), 4000)
  }, [engine, showAnalysis, game.fen])

  return (
    <div className={cn('chess-board-container', className)}>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Board + side panels */}
        <div className="flex gap-3 flex-1 min-w-0">
          {/* Eval bar */}
          {showAnalysis && (
            <div className="flex-shrink-0 w-6 self-stretch">
              <EvaluationBar
                evaluation={engine.evaluation}
                mate={engine.mate}
                orientation={orientation}
              />
            </div>
          )}

          {/* Main board column */}
          <div className="flex-1 min-w-0">
            {/* Captured pieces (top = opponent) */}
            {showCapturedPieces && game.moveHistory.length > 0 && (
              <CapturedPieces
                history={game.moveHistory}
                upToIndex={game.moveIndex}
                side={orientation === 'white' ? 'black' : 'white'}
                className="mb-2"
              />
            )}

            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-emerald-500/5">
              <Chessboard
                position={game.fen}
                onPieceDrop={onPieceDrop}
                onSquareClick={onSquareClick}
                boardOrientation={orientation}
                arePiecesDraggable={interactive && !pgn}
                customDarkSquareStyle={{ backgroundColor: '#3a4a5c' }}
                customLightSquareStyle={{ backgroundColor: '#e8eef5' }}
                customSquareStyles={customSquareStyles}
                customArrows={customArrows}
                animationDuration={250}
              />
            </div>

            {/* Captured (bottom = own side) */}
            {showCapturedPieces && game.moveHistory.length > 0 && (
              <CapturedPieces
                history={game.moveHistory}
                upToIndex={game.moveIndex}
                side={orientation}
                className="mt-2"
              />
            )}

            {/* Game over banner */}
            <AnimatePresence>
              {game.gameResult && game.gameResult !== 'in-check' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'mt-3 px-4 py-3 rounded-xl text-center font-medium',
                    game.gameResult === 'checkmate'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  )}
                >
                  {game.gameResult === 'checkmate' && `Шах ба мат — ${game.turn === 'w' ? 'хар' : 'цагаан'} ялсан!`}
                  {game.gameResult === 'stalemate' && 'Тэнцсэн (stalemate)'}
                  {game.gameResult === 'draw' && 'Тэнцсэн'}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Engine readout */}
            {showAnalysis && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 px-3 py-2 rounded-xl glass border border-white/10 text-sm"
              >
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Brain className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono">
                    Гүн: {engine.depth} {engine.isAnalyzing && '...'}
                  </span>
                  {engine.evaluation !== null && (
                    <span className="font-mono ml-auto text-emerald-300">
                      {engine.evaluation >= 0 ? '+' : ''}{engine.evaluation.toFixed(2)}
                    </span>
                  )}
                  {engine.mate !== null && (
                    <span className="font-mono ml-auto text-rose-300">
                      M{Math.abs(engine.mate)}
                    </span>
                  )}
                </div>
                {engine.principalVariation && (
                  <p className="mt-1 text-xs text-white/50 truncate font-mono" title={engine.principalVariation}>
                    {engine.principalVariation}
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Right panel: move list + annotation */}
        {(showMoveList || currentAnnotation) && (
          <div className="lg:w-80 flex-shrink-0 space-y-4">
            {/* Annotation panel */}
            {currentAnnotation && (currentAnnotation.comment_mn || currentAnnotation.evaluation) && (
              <motion.div
                key={`ann-${game.moveIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-strong rounded-xl p-4 border border-white/10"
              >
                {currentAnnotation.evaluation && (
                  <div className="mb-3">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                      EVAL_BADGE[currentAnnotation.evaluation].color
                    )}>
                      <span className="font-mono font-bold">{EVAL_BADGE[currentAnnotation.evaluation].icon}</span>
                      {EVAL_BADGE[currentAnnotation.evaluation].label}
                    </span>
                  </div>
                )}
                {currentAnnotation.comment_mn && (
                  <p className="text-sm text-white/80 leading-relaxed">
                    {currentAnnotation.comment_mn}
                  </p>
                )}
              </motion.div>
            )}

            {showMoveList && (
              <MoveList
                history={game.moveHistory}
                currentIndex={game.moveIndex}
                onSelect={game.goToMove}
                className="max-h-96"
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {/* Navigation (lesson mode) */}
        {game.isLessonMode && (
          <>
            <ToolbarButton onClick={game.goStart} title="Эхэнд (Home)" disabled={game.moveIndex < 0}>
              <ChevronsLeft className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={game.goPrev} title="Өмнөх (←)" disabled={game.moveIndex < 0}>
              <ChevronLeft className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={game.togglePlay}
              title={game.isPlaying ? 'Зогсоох (Space)' : 'Тоглуулах (Space)'}
              variant="primary"
            >
              {game.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </ToolbarButton>
            <ToolbarButton onClick={game.goNext} title="Дараах (→)" disabled={game.moveIndex >= game.moveHistory.length - 1}>
              <ChevronRight className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={game.goEnd} title="Эцэст (End)" disabled={game.moveIndex >= game.moveHistory.length - 1}>
              <ChevronsRight className="w-4 h-4" />
            </ToolbarButton>

            <div className="h-6 w-px bg-white/10 mx-1" />
          </>
        )}

        <ToolbarButton onClick={game.reset} title="Дахин эхлүүлэх">
          <RotateCcw className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
          title="Самбарыг эргүүлэх"
        >
          <FlipVertical2 className="w-4 h-4" />
        </ToolbarButton>

        {/* Hint button (free play only) */}
        {interactive && !pgn && (
          <ToolbarButton
            onClick={showHint}
            title="Зөвлөгөө авах"
            variant={showHintArrow ? 'gold' : 'default'}
          >
            <Lightbulb className="w-4 h-4" />
            <span className="ml-1.5 text-xs">Hint</span>
          </ToolbarButton>
        )}

        {/* Engine toggle */}
        {(interactive || pgn) && (
          <ToolbarButton
            onClick={() => setShowAnalysis((s) => !s)}
            title="Engine analysis"
            variant={showAnalysis ? 'primary' : 'default'}
          >
            <Brain className="w-4 h-4" />
          </ToolbarButton>
        )}

        <ToolbarButton onClick={() => setSoundOn((s) => !s)} title={soundOn ? 'Дууг хаах' : 'Дууг нээх'}>
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </ToolbarButton>

        {/* Lesson progress (lesson mode) */}
        {game.isLessonMode && (
          <span className="ml-auto text-xs text-white/50 font-mono">
            {game.moveIndex + 1} / {game.moveHistory.length}
          </span>
        )}
      </div>

      {/* Help text */}
      {game.isLessonMode && (
        <p className="mt-3 text-xs text-white/40 text-center">
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 font-mono">←</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 font-mono">→</kbd> навигаци,{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 font-mono">Space</kbd> авто-тоглуулах
        </p>
      )}
    </div>
  )
}

function ToolbarButton({
  children,
  onClick,
  title,
  disabled,
  variant = 'default',
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  disabled?: boolean
  variant?: 'default' | 'primary' | 'gold'
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex items-center px-3 py-2 rounded-lg text-sm transition-all border',
        'disabled:opacity-30 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-emerald-500 hover:bg-emerald-400 text-ink-950 border-emerald-500',
        variant === 'gold' && 'bg-gold-500/20 text-gold-300 border-gold-500/40 hover:bg-gold-500/30',
        variant === 'default' && 'glass border-white/10 text-white/70 hover:text-white hover:border-white/30'
      )}
    >
      {children}
    </button>
  )
}

function BoardSkeleton() {
  return (
    <div className="aspect-square bg-gradient-to-br from-ink-800 to-ink-900 rounded-2xl border border-white/10 flex items-center justify-center">
      <div className="text-white/20 font-display text-9xl animate-pulse">♞</div>
    </div>
  )
}
