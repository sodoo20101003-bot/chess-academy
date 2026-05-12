'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Chess, type Square } from 'chess.js';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Target, Flame, ArrowRight, RotateCcw, Lightbulb,
  CheckCircle2, XCircle, TrendingUp, TrendingDown, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

const Chessboard = dynamic(
  () => import('react-chessboard').then((m) => m.Chessboard),
  { ssr: false, loading: () => <div className="aspect-square w-full max-w-[600px] mx-auto bg-white/5 rounded-2xl animate-pulse" /> }
);

interface Puzzle {
  id: string;
  fen: string;
  rating: number;
  themes: string[] | null;
  description_mn: string | null;
  side_to_move: string | null;
}

interface UserStats {
  rating: number;
  puzzles_solved: number;
  puzzles_attempted: number;
  puzzle_streak: number;
}

interface Props {
  initialPuzzle: Puzzle | null;
  initialStats: UserStats;
  isLoggedIn: boolean;
}

type PuzzleState = 'thinking' | 'correct' | 'wrong' | 'show-solution';

export function PuzzleSolver({ initialPuzzle, initialStats, isLoggedIn }: Props) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(initialPuzzle);
  const [stats, setStats] = useState<UserStats>(initialStats);
  const [game, setGame] = useState<Chess | null>(null);
  const [state, setState] = useState<PuzzleState>('thinking');
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [feedback, setFeedback] = useState<{ ratingChange: number; newRating: number; alreadySolved: boolean } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightSquares, setHighlightSquares] = useState<Record<string, React.CSSProperties>>({});

  // Initialize chess game and orientation when puzzle changes
  useEffect(() => {
    if (!puzzle) return;
    try {
      const newGame = new Chess(puzzle.fen);
      setGame(newGame);
      setOrientation(puzzle.side_to_move === 'b' ? 'black' : 'white');
      setState('thinking');
      setFeedback(null);
      setShowHint(false);
      setHighlightSquares({});
    } catch (e) {
      console.error('Invalid FEN', e);
      toast.error('Оньсогын байрлал буруу');
    }
  }, [puzzle]);

  const submitAttempt = useCallback(async (uci: string) => {
    if (!puzzle || loading) return;

    if (!isLoggedIn) {
      toast.error('Оньсого бодохын тулд нэвтэрнэ үү');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('solve_puzzle', {
      p_puzzle_id: puzzle.id,
      p_attempted_uci: uci,
    });

    setLoading(false);

    if (error) {
      toast.error('Алдаа: ' + error.message);
      // restore previous game state
      setGame(new Chess(puzzle.fen));
      return;
    }

    const result = data as { correct: boolean; rating_change: number; new_rating: number; already_solved: boolean };

    if (result.correct) {
      setState('correct');
      setFeedback({
        ratingChange: result.rating_change,
        newRating: result.new_rating,
        alreadySolved: result.already_solved,
      });
      // Update local stats
      if (!result.already_solved) {
        setStats((s) => ({
          rating: result.new_rating,
          puzzles_solved: s.puzzles_solved + 1,
          puzzles_attempted: s.puzzles_attempted + 1,
          puzzle_streak: s.puzzle_streak + 1,
        }));
      }
      // Зөв нүүдлийн талбайг ногоонолж тэмдэглэх
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      setHighlightSquares({
        [from]: { background: 'rgba(34, 197, 94, 0.4)' },
        [to]: { background: 'rgba(34, 197, 94, 0.6)' },
      });
    } else {
      setState('wrong');
      setFeedback({
        ratingChange: result.rating_change,
        newRating: result.new_rating,
        alreadySolved: result.already_solved,
      });
      if (!result.already_solved) {
        setStats((s) => ({
          rating: result.new_rating,
          puzzles_solved: s.puzzles_solved,
          puzzles_attempted: s.puzzles_attempted + 1,
          puzzle_streak: 0,
        }));
      }
      // Буруу нүүдлийн талбай улаан
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      setHighlightSquares({
        [from]: { background: 'rgba(239, 68, 68, 0.4)' },
        [to]: { background: 'rgba(239, 68, 68, 0.6)' },
      });
      // 1.5 секундын дараа байрлалыг сэргээх (дахин оролдох)
      setTimeout(() => {
        if (puzzle) {
          setGame(new Chess(puzzle.fen));
          setHighlightSquares({});
          setState('thinking');
        }
      }, 1500);
    }
  }, [puzzle, loading, isLoggedIn]);

  const onPieceDrop = useCallback((sourceSquare: string, targetSquare: string, piece: string): boolean => {
    if (!game || state !== 'thinking' || loading) return false;

    // Промоти болон UCI бэлдэх
    let promotion: string | undefined;
    if (piece && piece[1] === 'P') {
      const targetRank = targetSquare[1];
      if (targetRank === '8' || targetRank === '1') {
        promotion = 'q'; // default queen
      }
    }

    try {
      const moveResult = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
      });

      if (!moveResult) return false;

      // UCI хэлбэрт хөрвүүлэх
      const uci = sourceSquare + targetSquare + (promotion || '');

      // Server-т илгээх
      submitAttempt(uci);
      return true;
    } catch {
      return false;
    }
  }, [game, state, loading, submitAttempt]);

  async function loadNextPuzzle() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('next_puzzle_for_user');
    setLoading(false);

    if (error) {
      toast.error('Дараагийн оньсого ачаалахад алдаа');
      return;
    }

    const next = Array.isArray(data) ? data[0] : data;
    if (!next) {
      toast.success('🎉 Бүх оньсогуудыг тайлсан байна!');
      return;
    }
    setPuzzle(next as Puzzle);
  }

  function resetPosition() {
    if (puzzle) {
      setGame(new Chess(puzzle.fen));
      setHighlightSquares({});
      setState('thinking');
      setFeedback(null);
    }
  }

  function showSolution() {
    setState('show-solution');
    // Сүүлийн attempt-ыг ашиглан зөв хариу олуулъя — RPC-аас авах хэрэгтэй
    // Гэхдээ энгийн хувилбараар одоохондоо: зүгээр л puzzle-ыг алгасах
    toast.info('Оньсогыг алгасч байна...');
    setTimeout(() => loadNextPuzzle(), 800);
  }

  if (!puzzle) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <Target className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h2 className="font-display text-2xl text-white mb-2">Оньсого байхгүй</h2>
        <p className="text-white/60 mb-6">Та бүх оньсогуудыг тайлсан эсвэл одоохондоо оньсого байхгүй байна.</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8">
      {/* Board */}
      <div>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-mono">
              Оньсого №{puzzle.id.slice(0, 8)}
            </p>
            <h2 className="font-display text-2xl text-white">
              {orientation === 'white' ? 'Цагаан нүүх ээлж' : 'Хар нүүх ээлж'}
            </h2>
            {puzzle.description_mn && (
              <p className="text-sm text-white/60 mt-1">{puzzle.description_mn}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 font-mono">
              ⛹ {puzzle.rating}
            </span>
            {(puzzle.themes ?? []).slice(0, 2).map((t) => (
              <span key={t} className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Board */}
        <div className="relative max-w-[600px] mx-auto">
          {game && (
            <Chessboard
              position={game.fen()}
              boardOrientation={orientation}
              onPieceDrop={onPieceDrop}
              arePiecesDraggable={state === 'thinking' && !loading}
              customSquareStyles={highlightSquares}
              customBoardStyle={{
                borderRadius: '12px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
              }}
              customDarkSquareStyle={{ backgroundColor: '#769656' }}
              customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
            />
          )}

          {/* Overlay feedback */}
          <AnimatePresence>
            {state === 'correct' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-emerald-500/10 backdrop-blur-sm rounded-2xl pointer-events-none"
              >
                <div className="bg-emerald-500/90 px-8 py-4 rounded-2xl flex items-center gap-3 text-ink-950 shadow-2xl">
                  <CheckCircle2 className="w-8 h-8" />
                  <div>
                    <p className="font-display text-2xl">Зөв!</p>
                    {feedback && !feedback.alreadySolved && feedback.ratingChange > 0 && (
                      <p className="text-sm font-medium">+{feedback.ratingChange} рейтинг</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            {state === 'wrong' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-red-500/10 backdrop-blur-sm rounded-2xl pointer-events-none"
              >
                <div className="bg-red-500/90 px-8 py-4 rounded-2xl flex items-center gap-3 text-white shadow-2xl">
                  <XCircle className="w-8 h-8" />
                  <div>
                    <p className="font-display text-2xl">Буруу</p>
                    <p className="text-sm">Дахин оролдоно уу</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          {state === 'correct' ? (
            <Button onClick={loadNextPuzzle} variant="primary" size="lg" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Дараагийн оньсого
            </Button>
          ) : (
            <>
              <Button onClick={resetPosition} variant="outline" size="sm" disabled={loading}>
                <RotateCcw className="w-4 h-4" />
                Дахин эхлэх
              </Button>
              <Button onClick={() => setShowHint(true)} variant="outline" size="sm" disabled={showHint}>
                <Lightbulb className="w-4 h-4" />
                Зөвлөгөө
              </Button>
              <Button onClick={showSolution} variant="ghost" size="sm" disabled={loading}>
                Алгасах
              </Button>
            </>
          )}
        </div>

        {showHint && state === 'thinking' && (
          <div className="mt-4 mx-auto max-w-md p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-200/90">
            <Lightbulb className="w-4 h-4 inline mr-2" />
            {puzzle.themes && puzzle.themes.length > 0
              ? `Сэдэв: ${puzzle.themes.join(', ')}`
              : 'Хамгийн сайн нүүдэл бод. Тактикийг хайж олоорой.'}
          </div>
        )}
      </div>

      {/* Sidebar: stats */}
      <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <div className="glass-strong rounded-2xl p-6 border border-emerald-500/20">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-mono mb-3">
            Таны статистик
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-gold-400" />
              <div className="flex-1">
                <p className="text-xs text-white/50">Рейтинг</p>
                <p className="font-display text-3xl text-white tabular-nums">{stats.rating}</p>
              </div>
              {feedback && feedback.ratingChange !== 0 && state === 'correct' && (
                <div className={`flex items-center gap-1 text-sm font-mono ${feedback.ratingChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {feedback.ratingChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {feedback.ratingChange > 0 ? '+' : ''}{feedback.ratingChange}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs text-white/50">Тайлсан / Нийт</p>
                <p className="font-medium text-white">
                  <span className="text-emerald-400">{stats.puzzles_solved}</span>
                  <span className="text-white/40"> / {stats.puzzles_attempted}</span>
                  {stats.puzzles_attempted > 0 && (
                    <span className="text-white/40 text-xs ml-2">
                      ({Math.round((stats.puzzles_solved / stats.puzzles_attempted) * 100)}%)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Flame className={`w-5 h-5 ${stats.puzzle_streak > 0 ? 'text-orange-400' : 'text-white/30'}`} />
              <div>
                <p className="text-xs text-white/50">Дараалсан зөв</p>
                <p className="font-medium text-white">{stats.puzzle_streak}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-white/10">
          <p className="text-sm text-white/60 leading-relaxed">
            <strong className="text-white">Хэрхэн тоглох:</strong> Дүрсийг чирж оньсогыг бод. Зөв тайлбал рейтинг өснө, буруу бол буурна.
          </p>
        </div>

        {!isLoggedIn && (
          <div className="glass rounded-2xl p-5 border border-yellow-500/30 bg-yellow-500/5">
            <p className="text-sm text-yellow-200/90 leading-relaxed">
              Рейтинг хадгалж, дэвшлээ хянахын тулд нэвтэрнэ үү.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
