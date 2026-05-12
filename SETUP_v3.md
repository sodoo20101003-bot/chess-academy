# 🚀 Шинэ хувилбар суулгах заавар

Эхэндээ зөвхөн хуучин фолдероо солихоосоо өмнө дараах алхмуудыг хийгээрэй:

## 1. Server-аа зогсоох

Terminal цонхон дотроо `Ctrl + C` дарж dev server-аа зогсооно.

## 2. Хуучин файлуудаа орлуулах

Татсан zip-ийг тайлж шинэ chess-academy фолдероо тэр газар нь орлуулна. Эсвэл одоогийн фолдеро дотроо дараах файлуудыг шинэчлэх:

**Үндсэн өөрчлөгдсөн файлууд:**
- `src/middleware.ts` — Auth gate (анх орвол шууд login)
- `src/app/layout.tsx` — ChatProvider нэмэгдсэн
- `src/app/dashboard/page.tsx` — 1-on-1 booking нэмэгдсэн
- `src/app/lesson/[id]/page.tsx` — AskTeacher + Attachments + plan logic
- `src/app/admin/lessons/new/page.tsx` — Level + Attachment fields
- `src/components/layout/Footer.tsx` — Cyrillic key fix

**Шинэ файлууд:**
- `src/lib/plan-access.ts` — Plan эрхийн logic
- `src/components/chat/PublicChat.tsx` — 💬 chat widget
- `src/components/chat/ChatProvider.tsx`
- `src/components/lesson/AskTeacher.tsx` — Багшаас зөвлөгөө
- `src/components/lesson/LessonAttachments.tsx` — Татах файл
- `src/components/lesson/OneOnOneBooking.tsx` — 1-on-1 session
- `supabase/migrations/0003_plans_chat_bookings.sql` — Шинэ tables

## 3. Database шинэчлэх

Supabase Dashboard → SQL Editor дотор:

1. New query
2. `supabase/migrations/0003_plans_chat_bookings.sql` файлын бүх агуулгыг хуулж paste хийнэ
3. Run

## 4. Server дахин ажиллуулах

```bash
cd ~/Desktop/web-advenced/miniicodenuud/CHESS_ACADEM/chess-academy
npm run dev
```

## 5. Туршиж үзэх

Browser нээхэд `http://localhost:3000` нь шууд `/auth/login` руу redirect хийнэ — энэ зөв! Та анх орвол нэвтрэх дэлгэц харагдана.

---

# Шинэ онцлогууд

## ✅ Auth gate
- Анх орвол **landing page харагдахгүй**, шууд login дэлгэц
- Нэвтэрсний дараа л үндсэн site нээгдэнэ

## ✅ Plan tier-эрхүүд

| | Free | Basic | Pro |
|--|--|--|--|
| Анхан шат | ✅ | ✅ | ✅ |
| Дунд шат | ❌ | ✅ | ✅ |
| Ахисан шат | ❌ | ❌ | ✅ |
| Файл татах | ❌ | ✅ | ✅ |
| Багшаас зөвлөгөө | ❌ | ✅ | ✅ |
| 1-on-1 багштай (сард 1) | ❌ | ❌ | ✅ |
| Public chat | ❌ | ✅ Basic group | ✅ Pro group |

## ✅ Public chat (💬)
Нэвтэрсэн plan-той хэрэглэгчид баруун доод буланд **💬 icon** харагдана. Дарвал:
- Basic-ийнхэн → зөвхөн Basic-тай чатлана
- Pro-гийнхэн → зөвхөн Pro-той чатлана
- Free хэрэглэгчид icon огт харагдахгүй

## ✅ Багш бичлэг оруулах форм (`/admin/lessons/new`)

Бүх төрлийн файл оруулах:
- ✅ Текст (markdown content)
- ✅ Зураг URL
- ✅ PDF URL
- ✅ Видео URL
- ✅ PGN (нүүдлүүд)
- ✅ FEN (стартын position)
- ✅ Per-move annotations (тайлбар + сум + highlight)
- ✅ Exercises (дасгал)
- ✅ **Хичээлийн түвшин (Анхан/Дунд/Ахисан)**

## ✅ 1-on-1 booking

Pro plan хэрэглэгчид dashboard дээр **video эсвэл chat** session захиалах боломжтой. Сард зөвхөн нэг удаа.

## ✅ Шатрын самбар 100%

`chess.js` ашигласан тул бүх төрлийн нүүдэл (Queen долгио, Rook нь босоо/хэвтээ, Bishop диагональ, Knight L-shape, castling, en passant, promotion) автоматаар зөв шалгагддаг.

---

# Storage setup (Supabase)

Багшийн оруулсан PDF/зураг файлуудыг хадгалахын тулд:

1. Supabase Dashboard → **Storage**
2. **New bucket** дарж нэрийг `lesson-attachments` гэж тавина
3. Public хийнэ
4. RLS policy-уудыг migration script автомат тохируулна

Багш шинэ хичээл нэмэхдээ файлуудаа эхлээд storage руу upload хийгээд URL-ыг form-д оруулна.
