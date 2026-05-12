'use client';

import { motion } from 'framer-motion';
import { Brain, Trophy, Users, Video, Puzzle, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: Video,
    title: 'Интерактив видео хичээл',
    description: 'Багш нүүдэл хийхэд chess board дээр амьд харагдана. Сум, highlight, зөвлөмж бүхий.',
    color: 'emerald',
  },
  {
    icon: Brain,
    title: 'AI шинжилгээ',
    description: 'Stockfish engine таны нүүдлийг бодит цагт үнэлж, илүү сайн хувилбар санал болгоно.',
    color: 'gold',
  },
  {
    icon: Puzzle,
    title: 'Өдрийн оньсого',
    description: 'Өдөр бүр шинэ оньсого. Тактикийн ур чадвараа дээшлүүл, рейтингээ нэмэгдүүл.',
    color: 'emerald',
  },
  {
    icon: Trophy,
    title: 'Tournament & ranking',
    description: 'Бусадтай өрсөлдөж, leaderboard дээр гарч ир. Сар бүр шагналт тэмцээн.',
    color: 'gold',
  },
  {
    icon: Users,
    title: 'Гранд мастер багш нар',
    description: 'Монголын шилдэг шатарчдаас шууд хичээл аваарай. Бодит case study.',
    color: 'emerald',
  },
  {
    icon: BarChart3,
    title: 'Прогресс tracking',
    description: 'Сурч буй ахицаа график, статистикаар хар. Хүчтэй болон сул талаа танигтун.',
    color: 'gold',
  },
];

export function Features() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20 max-w-3xl mx-auto"
        >
          <div className="inline-block mb-4 text-xs uppercase tracking-[0.2em] text-emerald-400 font-medium">
            Чанартай боловсрол
          </div>
          <h2 className="font-display text-5xl md:text-7xl font-medium tracking-tight leading-[1.05]">
            Зүгээр л хичээл биш —
            <br />
            <span className="gradient-text italic">бүрэн академи</span>
          </h2>
        </motion.div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group glass rounded-3xl p-8 hover:border-white/20 transition-all duration-500 hover:-translate-y-1"
              >
                <div
                  className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:scale-110 ${
                    feat.color === 'emerald'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-gold-500/15 text-gold-400'
                  }`}
                >
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold mb-3 tracking-tight">
                  {feat.title}
                </h3>
                <p className="text-white/60 leading-relaxed">{feat.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
