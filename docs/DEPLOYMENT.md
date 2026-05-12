# Deployment Guide — GrandMaster.mn

Production-д гаргах бүрэн заавар. Vercel + Supabase + QPay.

---

## 1. Урьдчилсан бэлтгэл

### Шаардлагатай бүртгэлүүд

- [Vercel](https://vercel.com) — hosting (үнэгүй tier хангалттай)
- [Supabase](https://supabase.com) — database + auth + storage
- [QPay merchant](https://qpay.mn) — төлбөр (мерчантын данс шаардлагатай)
- [GitHub](https://github.com) — код хадгалах

### Шаардлагатай tools

```bash
node --version  # >= 20.0.0
npm --version   # >= 10.0.0
git --version
```

---

## 2. Supabase setup

### 2.1. Шинэ project үүсгэх

1. https://supabase.com/dashboard руу орно
2. **New project** дарна
3. Region: `Southeast Asia (Singapore)` — Монголд хамгийн ойр
4. Database password ширэхдээ хадгалаарай

### 2.2. Schema deploy хийх

```bash
# Supabase CLI суулгах
npm install -g supabase

# Login
supabase login

# Project link хийх
supabase link --project-ref YOUR_PROJECT_REF

# Migration ажиллуулах
supabase db push
```

Эсвэл гараар: SQL Editor дотор `supabase/migrations/0001_initial_schema.sql`-ийг хуулж paste хийнэ.

### 2.3. Auth тохируулах

**Authentication → Providers**:

- **Email**: Идэвхжүүлээд "Confirm email" асаах
- **Google**:
  1. https://console.cloud.google.com/ дээр OAuth client ID үүсгэх
  2. Authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
  3. Client ID + Secret-ийг Supabase-д оруулах

**Authentication → URL Configuration**:

- Site URL: `https://your-domain.com`
- Redirect URLs:
  - `https://your-domain.com/auth/callback`
  - `http://localhost:3000/auth/callback` (dev)

### 2.4. Storage үүсгэх

Storage табын дотор bucket үүсгэнэ:

- `avatars` — public
- `lesson-videos` — private (signed URL ашиглана)
- `course-covers` — public

### 2.5. API keys авах

**Settings → API**:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (нууц! зөвхөн server-д)

---

## 3. QPay setup

### 3.1. Merchant бүртгэл

1. https://qpay.mn руу хандана
2. Merchant application бөглөнө (бизнесийн бүртгэлтэй байх ёстой)
3. Зөвшөөрөгдсөний дараа **username + password + invoice code** авна

### 3.2. Webhook URL бүртгүүлэх

QPay merchant portal дотор callback URL тохируулна:

```
https://your-domain.com/api/qpay/callback
```

Callback URL-д `payment_id` query parameter автоматаар нэмэгдэж явдаг.

### 3.3. Test mode

Эхэндээ `https://merchant-sandbox.qpay.mn/v2` ашиглаж тестлээрэй. Production бэлэн болсны дараа `https://merchant.qpay.mn/v2`-руу шилжинэ.

---

## 4. Local development

```bash
# Repo clone
git clone <your-repo-url>
cd chess-academy

# Dependencies
npm install

# Environment variables
cp .env.example .env.local
# .env.local-аа бөглөнө

# Dev server
npm run dev
```

Эхний admin user үүсгэх:

1. http://localhost:3000/auth/signup-аар email-ээ бүртгүүлнэ
2. Supabase SQL Editor-аас:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
   ```

---

## 5. Vercel deploy

### 5.1. GitHub-д push хийх

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOU/chess-academy.git
git push -u origin main
```

### 5.2. Vercel руу холбох

1. https://vercel.com/new руу орно
2. GitHub repo сонгоно
3. **Framework Preset**: Next.js (auto-detected)
4. **Environment Variables** дотор `.env.local`-н бүгдийг хуулж нэмнэ:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
QPAY_USERNAME
QPAY_PASSWORD
QPAY_INVOICE_CODE
QPAY_BASE_URL
NEXT_PUBLIC_APP_URL
```

5. **Deploy** дарна

### 5.3. Custom domain

Vercel project → **Settings → Domains** дотор өөрийн domain-аа холбоно.

DNS record:
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

---

## 6. Production checklist

Гарахаас өмнө шалгах зүйлс:

- [ ] Бүх environment variables Vercel дээр тохируулагдсан
- [ ] Supabase Auth → URL Configuration-д production domain нэмсэн
- [ ] Google OAuth redirect URI-д production domain нэмсэн
- [ ] QPay callback URL production-д солигдсон
- [ ] `subscription_plans` table-д үнэн зөв үнэтэй plans орсон
- [ ] Дор хаяж 1-2 free хичээл нэмсэн
- [ ] RLS policies бүх table дээр идэвхтэй
- [ ] Service role key зөвхөн server-д ашиглагдаж байгаа
- [ ] Domain-д SSL/HTTPS идэвхтэй
- [ ] Google Analytics эсвэл Vercel Analytics холбосон
- [ ] Error monitoring (Sentry г.м) холбосон
- [ ] Backup стратеги тохируулсан (Supabase автомат хийдэг)

---

## 7. Maintenance

### Regular tasks

- **Daily**: Payment failures шалгах (admin dashboard-аас)
- **Weekly**: Supabase usage шалгах
- **Monthly**: Database backup verify хийх

### Updates

```bash
# Dependencies шинэчлэх
npm outdated
npm update

# Migration нэмэх
supabase migration new add_new_feature
# SQL бичээд:
supabase db push
```

---

## 8. Troubleshooting

**"Failed to fetch" auth дээр**: Site URL буруу, Supabase URL configuration шалгах

**QPay invoice үүсэхгүй**: Username/password шалгах, network logs шалгах

**Video дөрвөлжин гарахгүй**: Storage bucket policy шалгах, signed URL хугацаа дуусаагүй эсэхийг шалгах

**RLS алдаа**: Policy шалгах, `auth.uid()` зөв дуудагдаж байгаа эсэхийг шалгах

---

Асуудал тулгарвал GitHub Issues дээр асуулт нээж эсвэл support@your-domain.com руу холбогдоорой.
