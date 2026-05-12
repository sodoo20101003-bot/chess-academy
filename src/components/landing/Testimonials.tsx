'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote: 'Хүүгийн минь шатрын мэдлэг 3 сард 400 рейтинг ахисан. Багш нар үнэхээр чадварлаг.',
    author: 'Энхбаяр Б.',
    role: 'Эцэг, 10 настай хүүхдийн',
    rating: 5,
  },
  {
    quote: 'Видео хичээлүүд маш ойлгомжтой. Chess board дээр сум зурдаг нь миний хувьд хамгийн хэрэгтэй санагдсан.',
    author: 'Сараа Д.',
    role: 'Их сургуулийн оюутан',
    rating: 5,
  },
  {
    quote: 'Монгол хэл дээр премиум контент байна гэж хэзээ ч төсөөлөөгүй. Үнэ ч боломжийн.',
    author: 'Болд Г.',
    role: 'IT-ийн инженер, шатарч',
    rating: 5,
  },
  {
    quote: 'Engine-ийн шинжилгээ маш хүчтэй. Хаана алдаа гаргадгаа эцэст нь ойлгож эхэлсэн.',
    author: 'Номин-Эрдэнэ Ц.',
    role: 'Tournament тоглогч',
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-block mb-4 text-xs uppercase tracking-[0.2em] text-emerald-400 font-medium">
            Сэтгэгдэл
          </div>
          <h2 className="font-display text-5xl md:text-7xl font-medium tracking-tight">
            <span className="gradient-text italic">1,200+</span> оюутан
            <br />
            манайхыг сонгожээ
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass rounded-3xl p-8 hover:border-white/20 transition-all"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-5">
                {Array.from({ length: t.rating }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-gold-400 text-gold-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="font-display text-xl md:text-2xl leading-relaxed text-white/90 mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-5 border-t border-white/5">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500/30 to-gold-500/30 flex items-center justify-center font-semibold">
                  {t.author[0]}
                </div>
                <div>
                  <div className="font-medium">{t.author}</div>
                  <div className="text-xs text-white/40">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
