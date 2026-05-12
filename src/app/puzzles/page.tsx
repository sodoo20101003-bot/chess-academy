import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PuzzleSolver } from '@/components/chess/PuzzleSolver';
import Link from 'next/link';
import { Trophy } from 'lucide-react';

export const metadata = {
  title: 'Оньсого — GrandMaster.mn',
  description: 'Шатрын тактикийн оньсого бод, рейтингээ ахиул.',
};

export default async function PuzzlesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Anh udaagiin puzzle hereglegchiin reityingt taaruulah
  const { data: puzzleData } = await supabase.rpc('next_puzzle_for_user');
  const puzzle = Array.isArray(puzzleData) ? puzzleData[0] : puzzleData;

  // Хэрэглэгчийн stat
  let stats = {
    rating: 1200,
    puzzles_solved: 0,
    puzzles_attempted: 0,
    puzzle_streak: 0,
  };

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('rating, puzzles_solved, puzzles_attempted, puzzle_streak')
      .eq('id', user.id)
      .single();
    if (profile) {
      stats = {
        rating: profile.rating ?? 1200,
        puzzles_solved: profile.puzzles_solved ?? 0,
        puzzles_attempted: profile.puzzles_attempted ?? 0,
        puzzle_streak: profile.puzzle_streak ?? 0,
      };
    }
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar />
      <main className="pt-28 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex items-end justify-between gap-4 mb-10 flex-wrap">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">
                Тактик дасгал
              </p>
              <h1 className="font-display text-5xl md:text-6xl text-white">
                Оньсогууд
              </h1>
              <p className="text-white/60 mt-3 max-w-xl">
                Бодит шатрын байрлалаас гарсан тактикууд. Бод, сур, рейтингээ ахиулаарай.
              </p>
            </div>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 text-gold-400 transition-colors"
            >
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">Тэргүүний жагсаалт</span>
            </Link>
          </div>

          <PuzzleSolver
            initialPuzzle={puzzle ?? null}
            initialStats={stats}
            isLoggedIn={!!user}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
