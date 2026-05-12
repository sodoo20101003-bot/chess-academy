'use client'

import { Chess, type Move, type Square } from 'chess.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { play } from './sounds'

export interface UseChessGameOptions {
  initialFen?: string
  pgn?: string
  onMove?: (move: Move) => void
  onMoveIndexChange?: (index: number) => void
  enableSound?: boolean
}

export interface ChessGameState {
  fen: string
  moveIndex: number
  moveHistory: Move[]
  isPlaying: boolean
  isGameOver: boolean
  gameResult: 'checkmate' | 'stalemate' | 'draw' | 'in-check' | null
  turn: 'w' | 'b'
  /** True when there's a PGN loaded (lesson mode) */
  isLessonMode: boolean
}

export interface ChessGameActions {
  goToMove: (index: number) => void
  goNext: () => void
  goPrev: () => void
  goStart: () => void
  goEnd: () => void
  togglePlay: () => void
  reset: () => void
  /** Returns true if the move was legal & applied */
  attemptMove: (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') => Move | null
  /** Get legal moves from a square (for hint dots) */
  getLegalMoves: (from: Square) => Move[]
}

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export function useChessGame(options: UseChessGameOptions = {}): ChessGameState & ChessGameActions {
  const {
    initialFen = DEFAULT_FEN,
    pgn,
    onMove,
    onMoveIndexChange,
    enableSound = true,
  } = options

  // Master game (PGN-loaded for lesson navigation)
  const lessonGame = useMemo(() => {
    if (!pgn) return null
    const g = new Chess()
    try {
      g.loadPgn(pgn)
      return g
    } catch {
      return null
    }
  }, [pgn])

  const moveHistory = useMemo<Move[]>(() => {
    if (!lessonGame) return []
    return lessonGame.history({ verbose: true })
  }, [lessonGame])

  const [game, setGame] = useState(() => {
    const g = new Chess()
    try { g.load(initialFen) } catch {}
    return g
  })

  const [moveIndex, setMoveIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const playTimer = useRef<NodeJS.Timeout | null>(null)

  const playSound = useCallback((s: 'move' | 'capture' | 'check' | 'checkmate') => {
    if (enableSound) play(s)
  }, [enableSound])

  // Derived game-over state
  const gameResult = useMemo<ChessGameState['gameResult']>(() => {
    if (game.isCheckmate()) return 'checkmate'
    if (game.isStalemate()) return 'stalemate'
    if (game.isDraw()) return 'draw'
    if (game.inCheck()) return 'in-check'
    return null
  }, [game])

  const goToMove = useCallback((idx: number) => {
    if (!lessonGame || moveHistory.length === 0) return

    const clamped = Math.max(-1, Math.min(idx, moveHistory.length - 1))
    const newGame = new Chess(initialFen)
    for (let i = 0; i <= clamped; i++) {
      newGame.move(moveHistory[i].san)
    }
    setGame(newGame)
    setMoveIndex(clamped)
    onMoveIndexChange?.(clamped)

    // Sound for the move just played
    if (clamped >= 0 && clamped > moveIndex) {
      const m = moveHistory[clamped]
      if (newGame.isCheckmate()) playSound('checkmate')
      else if (newGame.inCheck()) playSound('check')
      else if (m.captured) playSound('capture')
      else playSound('move')
    }
  }, [lessonGame, moveHistory, initialFen, onMoveIndexChange, moveIndex, playSound])

  const goNext = useCallback(() => goToMove(moveIndex + 1), [goToMove, moveIndex])
  const goPrev = useCallback(() => goToMove(moveIndex - 1), [goToMove, moveIndex])
  const goStart = useCallback(() => goToMove(-1), [goToMove])
  const goEnd = useCallback(() => goToMove(moveHistory.length - 1), [goToMove, moveHistory.length])

  const togglePlay = useCallback(() => setIsPlaying((p) => !p), [])

  // Auto-play
  useEffect(() => {
    if (!isPlaying) return
    if (moveIndex >= moveHistory.length - 1) {
      setIsPlaying(false)
      return
    }
    playTimer.current = setTimeout(() => goNext(), 1200)
    return () => {
      if (playTimer.current) clearTimeout(playTimer.current)
    }
  }, [isPlaying, moveIndex, moveHistory.length, goNext])

  const reset = useCallback(() => {
    if (lessonGame) {
      goToMove(-1)
    } else {
      const g = new Chess()
      try { g.load(initialFen) } catch {}
      setGame(g)
    }
    setIsPlaying(false)
  }, [lessonGame, goToMove, initialFen])

  const attemptMove = useCallback((from: Square, to: Square, promotion: 'q' | 'r' | 'b' | 'n' = 'q'): Move | null => {
    if (pgn) return null // free-play disabled in lesson mode
    const newGame = new Chess(game.fen())
    try {
      const move = newGame.move({ from, to, promotion })
      if (!move) return null
      setGame(newGame)
      onMove?.(move)

      if (newGame.isCheckmate()) playSound('checkmate')
      else if (newGame.inCheck()) playSound('check')
      else if (move.captured) playSound('capture')
      else playSound('move')

      return move
    } catch {
      return null
    }
  }, [game, pgn, onMove, playSound])

  const getLegalMoves = useCallback((from: Square): Move[] => {
    return game.moves({ square: from, verbose: true })
  }, [game])

  // Keyboard navigation (lesson mode only)
  useEffect(() => {
    if (!pgn) return

    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); goNext(); break
        case 'ArrowLeft': e.preventDefault(); goPrev(); break
        case 'Home': e.preventDefault(); goStart(); break
        case 'End': e.preventDefault(); goEnd(); break
        case ' ':
          // Space = play/pause
          e.preventDefault()
          togglePlay()
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pgn, goNext, goPrev, goStart, goEnd, togglePlay])

  return {
    fen: game.fen(),
    moveIndex,
    moveHistory,
    isPlaying,
    isGameOver: game.isGameOver(),
    gameResult,
    turn: game.turn(),
    isLessonMode: !!pgn,
    goToMove,
    goNext,
    goPrev,
    goStart,
    goEnd,
    togglePlay,
    reset,
    attemptMove,
    getLegalMoves,
  }
}
