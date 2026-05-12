# ♞ GrandMaster.mn

> Монгол хүүхэд, залуучуудад зориулсан premium online chess academy platform — production-grade Next.js + Supabase + QPay starter.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)]()
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-green)]()
[![QPay](https://img.shields.io/badge/QPay-Integrated-emerald)]()

---

## ⚡ Юу багтсан вэ

✅ **Бүрэн ажилладаг foundation** — landing, auth, courses, lessons, payments, admin

✅ **Багш контентоо шууд websiteаас оруулах** — `/admin/lessons/new` дээр markdown + PGN + per-move annotations

✅ **Интерактив шатрын самбар** — `chess.js` + `react-chessboard` дээр баригдсан, lesson playback + free-play горим

✅ **QPay-ийн бүрэн integration** — invoice үүсгэх, QR код, callback verification, polling fallback, subscription extension

✅ **Premium UI/UX** — Apple + Chess.com mix, glassmorphism, Framer Motion-ыг ашигласан smooth animations

✅ **Бүрэн RLS-тэй database schema** — 9 table, indexes, triggers, helper functions

✅ **Production-ready security** — webhook verification, signed URLs, anti-download protection, route protection

---

## 🚀 Хурдан эхлэх

```bash
# 1. Dependencies
npm install

# 2. Environment setup
cp .env.example .env.local
# .env.local-аа Supabase + QPay credentials-ээр бөглөнө

# 3. Database setup
# Supabase Dashboard → SQL Editor дотор:
# supabase/migrations/0001_initial_schema.sql-ийг хуулж run хийнэ

# 4. Dev server
npm run dev
```

http://localhost:3000

---

## 🗂 Файлын бүтэц

```
chess-academy/
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── page.tsx        # Landing (Hero, Features, Pricing, Testimonials)
│   │   ├── auth/           # Login, signup, OAuth callback
│   │   ├── courses/        # Catalog + course detail
│   │   ├── lesson/[id]/    # Lesson viewer with chess board
│   │   ├── pricing/        # Plans + QPay checkout
│   │   ├── dashboard/      # User home
│   │   ├── admin/          # ⭐ Багшийн контент удирдлага
│   │   └── api/qpay/       # invoice / callback / status endpoints
│   ├── components/
│   │   ├── chess/          # ⭐ ChessBoard.tsx — interactive
│   │   ├── landing/        # Hero, Features, Pricing, ChessBackground...
│   │   ├── pricing/        # PricingTable, CheckoutFlow
│   │   ├── courses/        # CourseCard, CategoryFilter
│   │   ├── ui/             # Button, Card
│   │   └── layout/         # Navbar, Footer
│   ├── lib/
│   │   ├── supabase/       # client + server + middleware
│   │   ├── qpay/           # API wrapper with auth, retry, error handling
│   │   └── utils.ts
│   ├── types/database.ts
│   └── middleware.ts       # Route protection
├── supabase/migrations/    # SQL schema versioned
├── docs/                   # DEPLOYMENT, QPAY_SETUP, ARCHITECTURE
└── package.json
```

---

## 🎨 Design system

| Token | Value | Хэрэглээ |
|-------|-------|----------|
| Primary background | `#050506` (ink-950) | Бүх page-н фон |
| Surface | `rgba(255,255,255,0.03)` + blur | Glassmorphic cards |
| Primary action | Emerald-400 (`#34d399`) | CTA, links, success |
| Premium accent | Gold-400 (`#f5d97a`) | Grandmaster, premium badges |
| Display font | Cormorant Garamond (italic) | Headlines |
| Body font | Geist Sans | Бүх body text |
| Mono | JetBrains Mono | Labels, stats |

---

## 💳 Subscription tiers

| Tier | Сар | Жил | Хичээлүүд |
|------|------|------|-----------|
| **Free** | 0₮ | 0₮ | 5 эхлэгчийн хичээл + өдрийн оньсого |
| **Basic** | 29,000₮ | 290,000₮ | Бүх эхлэгч + дунд түвшний хичээлүүд |
| **Pro** ⭐ | 59,000₮ | 590,000₮ | Бүх хичээл + tactics + AI coach |
| **Grandmaster** | 99,000₮ | 990,000₮ | Pro + 1-on-1 багштай sessions |

---

## 🔐 Чухал security шинж

- **Row Level Security** бүх table дээр идэвхтэй
- **Webhook verification**: QPay callback ирэхэд body-г шууд итгэхгүй, API-аар дахин шалгана
- **Signed URLs** видеоны хувьд (production-д идэвхжүүлэх)
- **Anti-download**: `controlsList="nodownload"` + context menu блоклох
- **Route protection**: middleware дээр session + role шалгалт
- **Service role key** зөвхөн server-side (webhook, admin actions)

---

## 📚 Дэлгэрэнгүй docs

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Vercel + Supabase + QPay-р production-д гаргах
- [`docs/QPAY_SETUP.md`](docs/QPAY_SETUP.md) — QPay merchant onboarding + webhook setup
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Архитектурын шийдвэрүүд + roadmap

---

## ⚠️ Production-д гарахаасаа өмнө

Энэ codebase нь бүрэн **foundation** боловч дараах зүйлс хийгдээгүй (бүрэн жагсаалт `docs/ARCHITECTURE.md` дотор):

- [ ] Forgot password flow
- [ ] Profile edit + avatar upload
- [ ] Admin: courses CRUD UI
- [ ] Admin: students/payments management
- [ ] Video upload UI to Supabase Storage
- [ ] Puzzles + Leaderboard pages
- [ ] AI coach integration
- [ ] Engine evaluation (Stockfish WASM)
- [ ] E2E tests + monitoring

Эдгээр feature-үүдийг team-р 1-3 сард бүрдүүлэх боломжтой.

---

## 🏗 Build хийсэн зүйлс

Хэдхэн өндөрлөг:

- ⭐ **`/admin/lessons/new`** — багш markdown + PGN + per-move annotations + видео URL-аар шинэ хичээл оруулдаг live-preview-той форм
- ⭐ **`ChessBoard` component** — PGN playback, navigation, annotations rendering, free-play mode-ыг бүгдийг handle хийдэг
- ⭐ **QPay end-to-end flow** — `/api/qpay/invoice` нэхэмжлэх үүсгэх, frontend-д QR + bank deep links үзүүлэх, polling + webhook hybrid-аар payment баталгаажуулах
- ⭐ **Premium landing page** — animated chess piece background, glassmorphic feature cards, monthly/yearly toggle pricing
- ⭐ **Database schema** — 9 table, RLS, triggers, helper functions бүгд seed data-тай хамт

---

## 🤝 Тус ачлал

Pull request-үүд тавтай морил! Том шинэ feature нэмэхийн өмнө issue нээж асуулт асуугаарай.

---

## 📄 License

MIT — өөрчилж, ашиглаж болно.

---

**Шатрын мастер болох таны зам энд эхэлж байна.** ♞
