# GrandMaster.mn — Засвар ба шинэ функцийн тэмдэглэл

## Юу зассан / нэмсэн вэ?

### 1. Build алдааг засав (Stockfish)
**Алдаа:** `src/components/chess/useStockfish.ts:63` дээр `new Worker(URL.createObjectURL(...))`-ийг Turbopack/Webpack бүтээгч static analyse хийж чадахгүй (TP1001).

**Шийдэл:** Stockfish-ийг public folder-т self-host хийж, статик URL-ээр `new Worker('/stockfish/stockfish.js')` гэж дуудна.

**Хэрэгжүүлэх алхамууд:**
```bash
# 1. Stockfish-ийг суулгах
npm install stockfish.wasm@0.10.0

# 2. Файлуудыг public/-руу хуулах
node scripts/copy-stockfish.mjs

# 3. (заавал биш) package.json-д postinstall script нэмж automate-лах:
#    "scripts": { "postinstall": "node scripts/copy-stockfish.mjs" }
```

Үр дүнд `public/stockfish/stockfish.js` болон `stockfish.wasm` файлууд бий болно.

---

### 2. Хичээлийн категори → Plan tier
**Хуучин:** "Эхлэгч / Дунд / Ахисан / Нээлт / Дундын тоглоом / Төгсгөл / Тактик / Стратеги" гэх олон категори.

**Шинэ:** Зөвхөн **Basic / Pro / Grandmaster** гэсэн 3 plan-аар хуваагдана. Хэрэглэгч өөрийн авсан planд хамаатай хичээлийг үзнэ. Өөрөөс дээш tier шаардсан хичээл түгжээтэй харагдаж, `/pricing`-руу заагдана.

**DB өөрчлөлт** (`migrations/0009_unified_plan_and_chat.sql`):
- `lessons` хүснэгтэд `plan_tier` enum нэмэв (`basic` | `pro` | `grandmaster`).
- Хуучин `required_tier` талбараас автоматаар миграцилна.

---

### 3. Нийтийн chat-ийг нэгтгэв
**Хуучин:** Plan tier бүрд тусдаа chat room (`basic`, `pro`, `gm`).

**Шинэ:** Бүх нэвтэрсэн хэрэглэгч **ганц `public` room**-д ярилцана. Plan-аас үл хамаарна.

**DB өөрчлөлт** (мөн `0009`-д):
- Бүх хуучин `chat_messages.room` утгуудыг `'public'` болгож шилжүүлэв.
- RLS policy шинэчилсэн — зөвхөн `room = 'public'` уншиж бичнэ.
- Rate limit (2 секундэд 1 мессеж) хадгалагдсан.

---

### 4. Багшийн захиалгын систем (шинэ)
**Зорилго:** Pro / Grandmaster planтай хэрэглэгч багштай хувийн цаг товлоно. Багш өөрөө захиалгыг харж баталгаажуулна.

#### Хүснэгтүүд (`migrations/0010_teacher_bookings.sql`):
- `teacher_profiles` — Багшийн дэлгэрэнгүй (нэр, цол, рейтинг, био, аватар, идэвхтэй эсэх).
- `teacher_availability` — Долоо хоног бүрийн ажиллах цагийн загвар (weekday + start_hour + end_hour).
- `bookings` — Захиалгууд (status: pending / approved / rejected / cancelled / completed).

#### Давхар захиалгаас сэргийлэх:
DB-түвшний `EXCLUDE USING gist` constraint (`bookings_no_overlap`) нэг багш нэг цагт зөвхөн нэг `pending`/`approved` захиалгатай байхыг баталгаажуулна. ezaal.mn маягтай — хоёр сурагч нэг цагийг авч чадахгүй.

#### RPC: `book_lesson(p_teacher_id, p_start_at, p_topic)`
Атомик байдлаар захиалга үүсгэнэ. Шалгадаг зүйлс:
- Хэрэглэгч нэвтэрсэн эсэх
- Plan tier нь pro / grandmaster эсэх
- Багш идэвхтэй эсэх
- Цаг нь бүтэн цаг (минут = 0) эсэх
- Цаг нь өнгөрсөн биш эсэх
- Давхардаагүй эсэх (constraint түшсэн)

Алдааг ойлгомжтой message-р буцаана.

#### Хэрэглэгчийн интерфэйс:
- **`/teachers`** — Багш нарын жагсаалт. Basic plan-тай хэрэглэгчид "Plan дээшлүүлэх" CTA.
- **`/teachers/[id]`** — Багш нэгэн дэлгэрэнгүй + цагийн grid (7 өдөр × 09:00–22:00).
- **`/dashboard/bookings`** — Сурагчийн "Миний захиалга". Зурагт байсан маягтай — багш, өдөр, цаг, статус. **Үнийн талбаргүй** (Pro/GM planд багтсан тул).
- **`/teacher/bookings`** — Багшийн талаас захиалгуудыг баталгаажуулах, татгалзах, тэмдэглэл бичих.

#### API:
- `POST /api/bookings` — Шинэ захиалга үүсгэх (book_lesson RPC дуудна).
- `PATCH /api/bookings/[id]` — Статус шинэчлэх (сурагч cancel, багш approve/reject/complete).

---

### 5. Admin 404 алдаануудыг засав
**Хуучин:** `/admin/students`, `/admin/payments` гэх мэт линкүүд 404 алдаа өгдөг байсан.

**Шинэ хуудаснууд:**
- `/admin/students` — Сурагчдын жагсаалт + plan badge
- `/admin/payments` — Төлбөрүүд + орлогын статистик
- `/admin/courses` — Курсууд
- `/admin/teachers` — Багш нар
- `/admin/bookings` — Бүх захиалгууд + статус нэгтгэл
- `/admin` (шинэчилсэн) — 4 stats, 6 tile, pending booking badge

---

## DB migration ажиллуулах

Шинэ migration-ууд:
```
supabase/migrations/0009_unified_plan_and_chat.sql
supabase/migrations/0010_teacher_bookings.sql
```

```bash
# Локалд
npx supabase db reset

# Эсвэл production-д
npx supabase db push
```

> ⚠️ `0010` нь `btree_gist` extension шаардана — Supabase-д энэ нь default-аар идэвхжсэн байдаг.

---

## DB-д шаардлагатай талбарууд

Доорх талбарууд хүснэгтэнд байгаа эсэхийг шалгаарай. Хэрэв байхгүй бол өөрийн migration-аа нэмж хийнэ:

### `profiles`
- `role` — `student` | `teacher` | `admin`
- `plan_tier` — `basic` | `pro` | `grandmaster` (default: `basic`)
- `full_name`, `email`, `avatar_url`

### `lessons`
- `plan_tier` (0009-д үүсгэгдэнэ)
- `slug`, `title`, `title_mn`, `description_mn`, `order_index`, `is_free`, `thumbnail_url`

### `courses`
- `title`, `title_mn`, `slug`, `plan_tier`

### `payments`
- `amount_mnt`, `plan_tier`, `status` (`paid`|`pending`|`failed`|`refunded`)
- `qpay_invoice_id`, `paid_at`, `user_id`

### `chat_messages`
- `room`, `is_deleted`, `content`, `user_id`, `created_at`

---

## Захиалгын төлбөр

Хэрэглэгчийн тогтоосноор: **багштай цаг товлох нь Pro / Grandmaster planд багтсан** учраас захиалга бүрд тус тус төлбөр төлөхгүй. QPay-р шууд төлөлт ХИЙХГҮЙ. Багш өөрөө захиалгыг хүлээн авах / татгалзах эрхтэй.

---

## Файлуудын жагсаалт

### Шинэ / шинэчилсэн:
```
CHANGES.md                                   (энэ файл)
scripts/copy-stockfish.mjs                   (build helper)
src/lib/plan-access.ts                       (шинэчилсэн)
src/components/chess/useStockfish.ts         (build алдаа засав)
src/components/chat/PublicChat.tsx           (single public room)
src/app/lessons/page.tsx                     (3 plan-аар бүлэглэв)
src/app/teachers/page.tsx                    (шинэ)
src/app/teachers/[id]/page.tsx               (шинэ)
src/app/dashboard/bookings/page.tsx          (шинэ)
src/app/teacher/bookings/page.tsx            (шинэ)
src/app/api/bookings/route.ts                (шинэ)
src/app/api/bookings/[id]/route.ts           (шинэ)
src/components/booking/BookingCalendar.tsx   (шинэ)
src/components/booking/BookingActions.tsx    (шинэ)
src/components/booking/CancelBookingButton.tsx (шинэ)
src/app/admin/page.tsx                       (шинэчилсэн)
src/app/admin/students/page.tsx              (шинэ — 404 засав)
src/app/admin/payments/page.tsx              (шинэ — 404 засав)
src/app/admin/courses/page.tsx               (шинэ)
src/app/admin/teachers/page.tsx              (шинэ)
src/app/admin/bookings/page.tsx              (шинэ)
supabase/migrations/0009_unified_plan_and_chat.sql
supabase/migrations/0010_teacher_bookings.sql
```

---

## Дараагийн алхам (санал)

1. Багш нэвтрэх бол `profiles.role = 'teacher'` болгоод `teacher_profiles`-д бичлэг үүсгэх UI хэрэгтэй.
2. Багш өөрийн availability засах UI (`/teacher/availability`) — одоогийн төсөлд байхгүй.
3. Захиалга баталгаажихаар сурагчид email / push мэдэгдэл илгээх.
4. iCalendar (.ics) файлаар захиалга татах боломж.
