'use client';

import { motion } from 'framer-motion';

const pieces = ['♚', '♛', '♜', '♝', '♞', '♟'];

export function ChessBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Floating pieces */}
      {Array.from({ length: 14 }).map((_, i) => {
        const piece = pieces[i % pieces.length];
        const left = (i * 37) % 100;
        const top = (i * 53) % 100;
        const size = 60 + (i * 13) % 80;
        const duration = 8 + (i * 2) % 10;

        return (
          <motion.div
            key={i}
            className="absolute select-none text-white/[0.04] font-serif"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              fontSize: `${size}px`,
            }}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.3,
            }}
          >
            {piece}
          </motion.div>
        );
      })}

      {/* Subtle gradient orbs */}
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute top-1/3 -right-40 h-[400px] w-[400px] rounded-full bg-gold-500/8 blur-[120px]" />
    </div>
  );
}
