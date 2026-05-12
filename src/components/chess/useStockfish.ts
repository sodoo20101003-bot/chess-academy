'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Stockfish engine hook — спект болон шилдэг нүүдлийг шинжилдэг.
 *
 * Stockfish-ийг web worker-р ажиллуулж, UCI протоколоор харилцана.
 *
 * Worker URL нь Turbopack/webpack-ийн static analysis-д барагдсан string
 * литерал байх ёстой. Stockfish файлуудыг `public/stockfish/`-д self-host
 * хийсэн гэж тооцно (`scripts/copy-stockfish.mjs` postinstall script-ээр
 * автоматаар хуулагдана).
 *
 * Ашиглах:
 *   const engine = useStockfish({ enabled: true })
 *   engine.analyze(fen, { depth: 15 })
 */

export interface StockfishAnalysis {
  bestMove: string | null
  evaluation: number | null  // pawns; positive = white better
  mate: number | null         // moves to mate (signed)
  depth: number
  principalVariation: string
  isAnalyzing: boolean
}

interface UseStockfishOptions {
  enabled?: boolean
  silent?: boolean
}

/**
 * Static string URL — bundler-ийн static analysis-д барагдана.
 * Хуучин blob URL-аас үүдсэн `new Worker(URL.createObjectURL(???))` алдааг засна.
 */
const STOCKFISH_WORKER_URL = '/stockfish/stockfish.js'

export function useStockfish(options: UseStockfishOptions = {}): StockfishAnalysis & {
  analyze: (fen: string, opts?: { depth?: number; movetime?: number }) => void
  stop: () => void
} {
  const { enabled = true, silent = true } = options
  const workerRef = useRef<Worker | null>(null)
  const isReadyRef = useRef(false)
  const currentFenRef = useRef<string | null>(null)

  const [bestMove, setBestMove] = useState<string | null>(null)
  const [evaluation, setEvaluation] = useState<number | null>(null)
  const [mate, setMate] = useState<number | null>(null)
  const [depth, setDepth] = useState(0)
  const [pv, setPv] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    let worker: Worker | null = null
    try {
      worker = new Worker(STOCKFISH_WORKER_URL)
      workerRef.current = worker

      worker.onmessage = (e: MessageEvent) => {
        const line: string = typeof e.data === 'string' ? e.data : e.data?.line ?? ''
        if (!line) return
        if (!silent) console.debug('[stockfish]', line)

        if (line === 'uciok') {
          worker?.postMessage('isready')
          return
        }

        if (line === 'readyok') {
          isReadyRef.current = true
          return
        }

        if (line.startsWith('info')) {
          const depthMatch = line.match(/depth (\d+)/)
          if (depthMatch) setDepth(parseInt(depthMatch[1]))

          const cpMatch = line.match(/score cp (-?\d+)/)
          if (cpMatch) {
            setEvaluation(parseInt(cpMatch[1]) / 100)
            setMate(null)
          }

          const mateMatch = line.match(/score mate (-?\d+)/)
          if (mateMatch) {
            setMate(parseInt(mateMatch[1]))
            setEvaluation(null)
          }

          const pvMatch = line.match(/ pv (.+?)(?:$|\s+(?:bmc|info))/)
          if (pvMatch) setPv(pvMatch[1].trim())
        }

        if (line.startsWith('bestmove')) {
          const match = line.match(/bestmove (\S+)/)
          if (match && match[1] !== '(none)') {
            setBestMove(match[1])
          }
          setIsAnalyzing(false)
        }
      }

      worker.onerror = (e) => {
        if (!silent) console.error('[stockfish] worker error:', e)
        setIsAnalyzing(false)
      }

      worker.postMessage('uci')
    } catch (e) {
      if (!silent) console.error('[stockfish] init failed:', e)
    }

    return () => {
      worker?.terminate()
      workerRef.current = null
      isReadyRef.current = false
    }
  }, [enabled, silent])

  const analyze = useCallback(
    (fen: string, opts: { depth?: number; movetime?: number } = {}) => {
      const w = workerRef.current
      if (!w || !isReadyRef.current) {
        setTimeout(() => {
          if (workerRef.current && isReadyRef.current) analyze(fen, opts)
        }, 200)
        return
      }
      currentFenRef.current = fen
      setBestMove(null)
      setEvaluation(null)
      setMate(null)
      setDepth(0)
      setPv('')
      setIsAnalyzing(true)
      w.postMessage('stop')
      w.postMessage(`position fen ${fen}`)
      if (opts.movetime) w.postMessage(`go movetime ${opts.movetime}`)
      else w.postMessage(`go depth ${opts.depth ?? 14}`)
    },
    []
  )

  const stop = useCallback(() => {
    workerRef.current?.postMessage('stop')
    setIsAnalyzing(false)
  }, [])

  return {
    bestMove,
    evaluation,
    mate,
    depth,
    principalVariation: pv,
    isAnalyzing,
    analyze,
    stop,
  }
}
