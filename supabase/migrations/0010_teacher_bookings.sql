-- =====================================================
-- 0010: Багшийн захиалгын систем
-- =====================================================
-- Хүснэгтүүд:
--   teacher_profiles      — Багш бүрийн дэлгэрэнгүй мэдээлэл
--   teacher_availability  — Долоо хоног бүрийн ажиллах цагийн загвар
--   bookings              — Сурагчийн захиалга (давхардлаас сэргийлсэн)
--
-- Зөвхөн pro/grandmaster planтай хэрэглэгч захиалж болно.
-- Багш өөрөө захиалгыг харж, баталгаажуулна (approved | rejected | completed).
-- Цаг давхардахаас сэргийлэх — DB-түвшний exclusion constraint.
-- =====================================================

-- ===== 1. teacher_profiles ============================
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  id            uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name  text NOT NULL,
  title_mn      text,                          -- "Их мастер", "Гросмастер"
  bio_mn        text,
  rating        integer,                       -- FIDE rating
  avatar_url    text,
  hourly_note   text,                          -- "1 цагийн хичээл" гэх мэт
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_active
  ON public.teacher_profiles (is_active) WHERE is_active = true;

-- ===== 2. teacher_availability ========================
-- Долоо хоног бүрийн давтагдах цагийн загвар.
-- weekday: 0=Ням, 1=Даваа, ..., 6=Бямба
CREATE TABLE IF NOT EXISTS public.teacher_availability (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  weekday      smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_hour   smallint NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
  end_hour     smallint NOT NULL CHECK (end_hour BETWEEN 1 AND 24),
  CHECK (end_hour > start_hour),
  UNIQUE (teacher_id, weekday, start_hour)
);

CREATE INDEX IF NOT EXISTS idx_teacher_availability_teacher
  ON public.teacher_availability (teacher_id, weekday);

-- ===== 3. bookings ====================================
-- Цагийн нарийвчлал — 1 цаг (start_at нь HH:00:00 байх).
-- Status:
--   pending    — Сурагч захиалсан, багш хараахан хариу өгөөгүй
--   approved   — Багш баталгаажуулсан
--   rejected   — Багш татгалзсан
--   cancelled  — Сурагч цуцалсан
--   completed  — Цаг дуусаж дууссан
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status_enum') THEN
    CREATE TYPE booking_status_enum AS ENUM (
      'pending', 'approved', 'rejected', 'cancelled', 'completed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bookings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id    uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  start_at      timestamptz NOT NULL,           -- UTC
  end_at        timestamptz NOT NULL,           -- = start_at + 1 hour
  status        booking_status_enum NOT NULL DEFAULT 'pending',
  topic_mn      text,                           -- Сурагчийн тэмдэглэл (юу сурахыг хүсэж буй)
  teacher_note  text,                           -- Багшийн тэмдэглэл (зөвхөн багш бичнэ)
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at = start_at + interval '1 hour'),
  CHECK (date_part('minute', start_at) = 0)     -- зөвхөн full-hour
);

CREATE INDEX IF NOT EXISTS idx_bookings_student
  ON public.bookings (student_id, start_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_teacher_start
  ON public.bookings (teacher_id, start_at);

CREATE INDEX IF NOT EXISTS idx_bookings_active_teacher_start
  ON public.bookings (teacher_id, start_at)
  WHERE status IN ('pending', 'approved');

-- ===== 4. Давхар захиалгаас сэргийлэх =================
-- Багш нэг цагт ганцхан active захиалгатай байна
-- (pending | approved нь "active" гэж тооцогдоно).
-- Хуучин cancelled/rejected захиалгууд блок болохгүй.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_no_overlap;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    teacher_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (status IN ('pending', 'approved'));

-- ===== 5. updated_at триггер ==========================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_bookings_updated ON public.bookings;
CREATE TRIGGER trg_bookings_updated
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_teacher_profiles_updated ON public.teacher_profiles;
CREATE TRIGGER trg_teacher_profiles_updated
  BEFORE UPDATE ON public.teacher_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== 6. RLS — teacher_profiles ======================
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_profiles_read" ON public.teacher_profiles;
CREATE POLICY "teacher_profiles_read" ON public.teacher_profiles
  FOR SELECT
  USING (is_active = true OR auth.uid() = id);

DROP POLICY IF EXISTS "teacher_profiles_update_self" ON public.teacher_profiles;
CREATE POLICY "teacher_profiles_update_self" ON public.teacher_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- admin/insert — service role-р эсвэл admin API-р (RLS-ийг тойрно)

-- ===== 7. RLS — teacher_availability ==================
ALTER TABLE public.teacher_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "availability_read_all" ON public.teacher_availability;
CREATE POLICY "availability_read_all" ON public.teacher_availability
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "availability_manage_self" ON public.teacher_availability;
CREATE POLICY "availability_manage_self" ON public.teacher_availability
  FOR ALL
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- ===== 8. RLS — bookings ==============================
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Read: сурагч өөрийн захиалгуудыг харна, багш өөрт ирсэн захиалгуудыг харна
DROP POLICY IF EXISTS "bookings_read_own" ON public.bookings;
CREATE POLICY "bookings_read_own" ON public.bookings
  FOR SELECT
  USING (
    auth.uid() = student_id
    OR auth.uid() = teacher_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert: сурагч өөрийн нэрээр захиалга үүсгэнэ, тэр нь pro/grandmaster planтай байх
-- (plan шалгалт нь book_lesson() RPC дотор давхар хийгдэнэ)
DROP POLICY IF EXISTS "bookings_insert_self" ON public.bookings;
CREATE POLICY "bookings_insert_self" ON public.bookings
  FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    AND status = 'pending'
  );

-- Update: сурагч cancel хийнэ, багш approve/reject/complete хийнэ
DROP POLICY IF EXISTS "bookings_update_student" ON public.bookings;
CREATE POLICY "bookings_update_student" ON public.bookings
  FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (
    auth.uid() = student_id
    AND status = 'cancelled'
  );

DROP POLICY IF EXISTS "bookings_update_teacher" ON public.bookings;
CREATE POLICY "bookings_update_teacher" ON public.bookings
  FOR UPDATE
  USING (auth.uid() = teacher_id)
  WITH CHECK (
    auth.uid() = teacher_id
    AND status IN ('approved', 'rejected', 'completed')
  );

-- ===== 9. RPC: book_lesson ============================
-- Атомик захиалга үүсгэх. Plan tier шалгаад insert хийнэ.
-- Давхардсан цагт exclusion constraint автоматаар алдаа өгнө —
-- бид түүнийг ойлгомжтой message-р буцаана.
CREATE OR REPLACE FUNCTION public.book_lesson(
  p_teacher_id uuid,
  p_start_at   timestamptz,
  p_topic      text DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_tier      text;
  v_booking   public.bookings;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Нэвтрэх шаардлагатай' USING ERRCODE = '28000';
  END IF;

  -- Plan tier шалгах — pro/grandmaster л захиалж болно
  SELECT plan_tier INTO v_tier
    FROM public.profiles
   WHERE id = v_user_id;

  IF v_tier NOT IN ('pro', 'grandmaster') THEN
    RAISE EXCEPTION 'Зөвхөн Pro эсвэл Grandmaster planтай хэрэглэгч багш захиалж чадна'
      USING ERRCODE = 'P0001';
  END IF;

  -- Багш идэвхтэй байх
  IF NOT EXISTS (
    SELECT 1 FROM public.teacher_profiles
     WHERE id = p_teacher_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Багш олдсонгүй' USING ERRCODE = 'P0002';
  END IF;

  -- start_at нь full hour байх (минут=0)
  IF date_part('minute', p_start_at) <> 0 OR date_part('second', p_start_at) <> 0 THEN
    RAISE EXCEPTION 'Цаг бүтэн цагаар (XX:00) байх ёстой' USING ERRCODE = 'P0003';
  END IF;

  -- start_at нь өнгөрсөн биш байх
  IF p_start_at < now() THEN
    RAISE EXCEPTION 'Өнгөрсөн цагт захиалж болохгүй' USING ERRCODE = 'P0004';
  END IF;

  -- Insert — давхардсан байвал exclusion constraint алдаа өгнө
  BEGIN
    INSERT INTO public.bookings (student_id, teacher_id, start_at, end_at, topic_mn)
    VALUES (v_user_id, p_teacher_id, p_start_at, p_start_at + interval '1 hour', p_topic)
    RETURNING * INTO v_booking;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Энэ цаг аль хэдийн захиалагдсан байна' USING ERRCODE = 'P0005';
  END;

  RETURN v_booking;
END $$;

REVOKE ALL ON FUNCTION public.book_lesson(uuid, timestamptz, text) FROM public;
GRANT EXECUTE ON FUNCTION public.book_lesson(uuid, timestamptz, text) TO authenticated;
