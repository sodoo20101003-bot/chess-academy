# Architecture & Feature Roadmap

Энэхүү codebase-н бүтэц, шийдвэр, цаашдын зам.

---

## 📐 Folder structure

```
chess-academy/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (public)            # Public pages
│   │   │   ├── page.tsx        # Landing
│   │   │   ├── courses/        # Course catalog & detail
│   │   │   └── pricing/        # Plans & checkout
│   │   ├── auth/               # Login, signup, callback
│   │   ├── dashboard/          # Logged-in user home
│   │   ├── lesson/[id]/        # Lesson viewer (video + chess board)
│   │   ├── admin/              # Багш / админ panel
│   │   │   ├── page.tsx        # Stats overview
│   │   │   └── lessons/new/    # ⭐ Багш контент нэмэх форм
│   │   ├── api/
│   │   │   └── qpay/           # invoice / callback / status
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                 # Button, Card (atomic)
│   │   ├── layout/             # Navbar, Footer
│   │   ├── landing/            # Hero, Features, Pricing, etc.
│   │   ├── courses/            # CourseCard, CategoryFilter
│   │   ├── pricing/            # PricingTable, CheckoutFlow
│   │   └── chess/              # ⭐ ChessBoard (interactive)
│   │
│   ├── lib/
│   │   ├── supabase/           # client, server, service
│   │   ├── qpay/               # QPay API wrapper
│   │   └── utils.ts
│   │
│   ├── types/
│   │   └── database.ts         # Hand-written DB types
│   │
│   └── middleware.ts           # Route protection + session refresh
│
├── supabase/
│   └── migrations/             # SQL schema versioned
│
├── docs/                       # DEPLOYMENT, QPAY_SETUP, this file
├── public/                     # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env.example
```

---

## 🎯 Шийдвэрлэсэн загварын асуудлууд

### 1. **Хичээлийн контент яаж хадгалах вэ?**

**Сонголт А**: Тусдаа CMS (Sanity, Contentful) — хэт complex
**Сонголт Б**: ✅ **Supabase-ийн `lessons.content_mn` нь markdown** + `annotations` jsonb

Багш `/admin/lessons/new` дээр markdown шууд бичиж, нүүдэл бүрт annotation (тайлбар, сум, highlight) нэмнэ. Энэ нь:

- ❌ Тусдаа CMS subscription шаардлагагүй
- ✅ Шууд websiteаас контент нэмж болно (хэрэглэгчийн "shuud websity aas nemj boldogg" шаардлага)
- ✅ PGN + per-move annotations нь шатарт зориулсан өвөрмөц
- ✅ Live preview (form-ийн баруун талд)

### 2. **Видео хэрхэн хамгаалах вэ?**

Эх кодын `lesson/[id]/page.tsx` дотор:

```tsx
<video
  controlsList="nodownload"
  onContextMenu={(e) => e.preventDefault()}
  src={lesson.video_url}
/>
```

Production-д **signed URL** ашиглах хэрэгтэй:

```ts
const { data } = await supabase.storage
  .from('lesson-videos')
  .createSignedUrl(`${lessonId}.mp4`, 3600) // 1 цаг
```

Илүү хүчтэй DRM хэрэгтэй бол [Mux](https://mux.com) эсвэл [Cloudflare Stream] ашиглах боломжтой.

### 3. **Subscription tier hierarchy**

```
free (0) < basic (1) < pro (2) < grandmaster (3)
```

Дээд tier нь доод tier-н бүх контентыг автоматаар авна. SQL-д:

```sql
WHERE required_tier_rank <= user_tier_rank
```

`courses/[slug]/page.tsx` дотор JS-ээр шийдсэн.

### 4. **Chess board mode-ууд**

`ChessBoard` component нь 3 mode-той:

1. **Free play**: User өөрөө нүүдэл хийдэг (`interactive=true`, no `pgn`)
2. **Lesson playback**: PGN + annotations дамжуулдаг (lesson page-д)
3. **Analysis**: Future — engine evaluation нэмэх

---

## 🔐 Security model

### Row Level Security (RLS)

Supabase-ийн бүх table дээр RLS идэвхтэй. Жишээ:

```sql
-- profiles: зөвхөн өөрөө уншина
CREATE POLICY "users_read_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- lessons: бүгд уншина (tier шалгалт app layer-т)
CREATE POLICY "lessons_read_published" ON lessons
  FOR SELECT USING (is_published = true);

-- payments: зөвхөн өөрийн төлбөр
CREATE POLICY "payments_own" ON payments
  FOR SELECT USING (auth.uid() = user_id);
```

### Service role key

Зөвхөн дараах endpoint-уудад ашиглагдана:
- `/api/qpay/callback` — webhook, user session байхгүй
- `/api/qpay/status` — payment record шинэчлэх

Frontend-д **хэзээ ч** service role key илчлэхгүй.

### Middleware route protection

```ts
// src/middleware.ts
const PROTECTED = ['/dashboard', '/courses', '/lesson', '/admin']
const ADMIN_ONLY = ['/admin']

if (PROTECTED.some(p => path.startsWith(p)) && !user) {
  return redirect('/auth/login')
}

if (ADMIN_ONLY.some(p => path.startsWith(p)) && profile.role !== 'admin') {
  return redirect('/dashboard')
}
```

---

## 🚀 Roadmap (одоохондоо хийгдээгүй)

Эх foundation бүрэн ажилладаг боловч production-grade болоход дараах зүйлс хэрэгтэй:

### Phase 1: Бүрэн MVP (1-2 долоо хоног)
- [ ] Forgot password page
- [ ] Profile edit + avatar upload
- [ ] Admin: courses CRUD (create/edit/delete курсүүд)
- [ ] Admin: students list (хэн юу үзсэн)
- [ ] Admin: payments table + revenue chart
- [ ] Admin: video upload to Supabase Storage with progress

### Phase 2: Engagement features (2-3 долоо хоног)
- [ ] `/puzzles` — өдрийн оньсого + history
- [ ] `/leaderboard` — rating + streak ranking
- [ ] Achievement system автомат гүйцэтгэгдэх trigger
- [ ] Email notifications (Resend integration)
- [ ] Streak counter + сэтгэл татах reminder

### Phase 3: Advanced (1+ сар)
- [ ] AI coach: Anthropic API ашиглан lesson chat
- [ ] Engine evaluation: Stockfish WASM browser-д
- [ ] Live tournaments: WebSocket-р real-time
- [ ] Comments / community section
- [ ] Mobile native app (React Native + хуваалцсан components)

### Phase 4: Scale
- [ ] Multi-language (Англи нэмэх)
- [ ] CDN видеоны хувьд (Cloudflare Stream)
- [ ] A/B testing framework
- [ ] Advanced analytics (PostHog эсвэл Plausible)

---

## 🛠 Тech debt & considerations

1. **Database types**: Одоогоор гараар бичигдсэн. Production-д `supabase gen types typescript --linked` ашиглаж auto-generate хийх ёстой.

2. **Form validation**: `react-hook-form` + `zod` суурилуулсан боловч одоогоор зарим form-д ашиглагдаагүй.

3. **i18n**: Одоохондоо string-ууд hardcode. Цаашид `next-intl` нэмэх.

4. **Error tracking**: Sentry эсвэл аналог нэмэх.

5. **Rate limiting**: `/api/qpay/*` endpoint-д rate limit нэмэх (Upstash Redis эсвэл Vercel KV).

6. **Tests**: E2E (Playwright) болон unit test (Vitest) нэмэх.

---

## 📊 Tech stack rationale

| Шийдэл | Шалтгаан |
|--------|----------|
| **Next.js 15 App Router** | RSC, streaming, form actions, Vercel optimization |
| **Supabase** | Postgres + Auth + Storage + Realtime бүгд нэг дор |
| **Tailwind v3** | Design system tokens, fast iteration |
| **Framer Motion** | Premium animations (hero, pricing toggle, etc.) |
| **chess.js + react-chessboard** | Industry standard, well-maintained |
| **QPay** | Монголын зах зээлд хамгийн өргөн хэрэглэгддэг |
| **Vercel** | Edge runtime, zero-config Next.js, Mongolia-near regions |

---

## 🎨 Design tokens

```css
--ink-950: #050506    /* Primary background */
--ink-900: #0a0d10    /* Cards */
--emerald-400: #34d399 /* Primary action */
--gold-400: #f5d97a    /* Premium accents */
--white/60: rgba(255,255,255,0.6)  /* Body text */
```

Glassmorphism:
```css
.glass {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08);
}
```

Typography:
- Display: **Cormorant Garamond** (serif italic for emphasis)
- Body: **Geist Sans**
- Mono: **JetBrains Mono** (for stats/labels)
