import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Trophy, Medal, Target, Flame, User } from 'lucide-react';

export const metadata = {
  title: 'Тэргүүний жагсаалт — GrandMaster.mn',
  description: 'Шилдэг тоглогчдын рейтингийн жагсаалт.',
};

interface LeaderboardEntry {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  rating: number;
  puzzles_solved: number;
  puzzles_attempted: number;
  puzzle_streak: number;
  rank: number;
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: leaders } = await supabase
    .from('puzzle_leaderboard')
    .select('*')
    .limit(50);

  const list = (leaders ?? []) as LeaderboardEntry[];

  // Хэрэглэгчийн өөрийнх нь зэрэг
  const myEntry = user ? list.find((l) => l.id === user.id) : null;

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar />
      <main className="pt-28 pb-24">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-12">
            <Trophy className="w-12 h-12 text-gold-400 mx-auto mb-4" />
            <p className="text-xs font-mono uppercase tracking-widest text-gold-400 mb-2">
              Tactical Mastery
            </p>
            <h1 className="font-display text-5xl md:text-6xl text-white mb-3">
              Тэргүүний жагсаалт
            </h1>
            <p className="text-white/60">
              Хамгийн өндөр рейтингтэй тоглогчид
            </p>
          </div>

          {/* My rank if not in top */}
          {user && !myEntry && (
            <div className="mb-6 p-4 rounded-xl glass border border-emerald-500/20 text-center text-sm text-white/60">
              Жагсаалтад орохын тулд хамгийн багадаа 3 оньсого тайл.
            </div>
          )}

          {list.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Trophy className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">Одоохондоо жагсаалт хоосон. Эхэндээ оньсого бодсон тоглогчид энд гарч ирнэ.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((entry) => {
                const isMe = user?.id === entry.id;
                const isPodium = entry.rank <= 3;
                return (
                  <div
                    key={entry.id}
                    className={`
                      flex items-center gap-4 p-4 rounded-2xl border transition-all
                      ${isMe ? 'glass-strong border-emerald-500/40 bg-emerald-500/5' : 'glass border-white/10'}
                      ${isPodium && !isMe ? 'border-gold-500/30' : ''}
                    `}
                  >
                    {/* Rank */}
                    <div className="w-10 flex-shrink-0 text-center">
                      {entry.rank === 1 ? (
                        <Medal className="w-7 h-7 text-gold-400 mx-auto" />
                      ) : entry.rank === 2 ? (
                        <Medal className="w-6 h-6 text-gray-300 mx-auto" />
                      ) : entry.rank === 3 ? (
                        <Medal className="w-6 h-6 text-orange-400 mx-auto" />
                      ) : (
                        <span className="font-mono text-white/40 text-lg">{entry.rank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-emerald-900/30 flex items-center justify-center">
                      {entry.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {entry.full_name || entry.username || 'Нэргүй тоглогч'}
                        {isMe && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                            Та
                          </span>
                        )}
                      </p>
                      {entry.username && entry.full_name && (
                        <p className="text-xs text-white/40 truncate">@{entry.username}</p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-white/60">
                        <Target className="w-3.5 h-3.5" />
                        <span className="font-mono">{entry.puzzles_solved}</span>
                      </div>
                      {entry.puzzle_streak > 0 && (
                        <div className="flex items-center gap-1 text-orange-400">
                          <Flame className="w-3.5 h-3.5" />
                          <span className="font-mono">{entry.puzzle_streak}</span>
                        </div>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-display text-2xl text-white tabular-nums">{entry.rating}</p>
                      <p className="text-xs text-white/40">рейтинг</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
