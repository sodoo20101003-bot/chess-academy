-- =====================================================
-- 0009: Хичээлийг зөвхөн plan-тэй холбох, chat-ийг нэгтгэх
-- =====================================================
-- Өөрчлөлтүүд:
--   1) Хичээлийн категори/түвшинг арилгаж, зөвхөн plan_tier-аар хяна:
--      basic | pro | grandmaster
--   2) Chat-ийг олон room-аас "public" гэсэн нэг room-руу нэгтгэв —
--      бүх нэвтэрсэн хэрэглэгч нэг chat-д ярилцана.
-- =====================================================

-- ===== 1. lessons.plan_tier ===========================

-- plan_tier enum үүсгэх (хэрэв одоо байхгүй бол)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_tier_enum') THEN
    CREATE TYPE plan_tier_enum AS ENUM ('basic', 'pro', 'grandmaster');
  END IF;
END $$;

-- plan_tier column нэмэх
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS plan_tier plan_tier_enum;

-- Хуучин required_tier-аас plan_tier руу мэдээллийг шилжүүлэх
-- (хэрэв required_tier колонк байгаа бол)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lessons'
      AND column_name = 'required_tier'
  ) THEN
    UPDATE public.lessons
       SET plan_tier = CASE
         WHEN required_tier::text IN ('grandmaster','gm') THEN 'grandmaster'::plan_tier_enum
         WHEN required_tier::text = 'pro' THEN 'pro'::plan_tier_enum
         ELSE 'basic'::plan_tier_enum
       END
     WHERE plan_tier IS NULL;
  END IF;
END $$;

-- Default: 'basic' (бүх хэрэглэгч үзнэ)
UPDATE public.lessons SET plan_tier = 'basic' WHERE plan_tier IS NULL;
ALTER TABLE public.lessons ALTER COLUMN plan_tier SET NOT NULL;
ALTER TABLE public.lessons ALTER COLUMN plan_tier SET DEFAULT 'basic';

CREATE INDEX IF NOT EXISTS idx_lessons_plan_tier ON public.lessons (plan_tier);

-- level колонкыг (анхан/дунд/ахисан) арилгахгүй — backwards compat-д үлдээе,
-- зөвхөн ашиглахгүй. UI энэ талбарыг харуулахгүй.

-- ===== 2. chat-ийг нэг room болгох ====================

-- Бүх хуучин room-уудыг 'public'-руу шилжүүлэх
UPDATE public.chat_messages SET room = 'public' WHERE room <> 'public';

-- Шинэ index — public chat-н query үр ашиг сайжруулах
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created
  ON public.chat_messages (room, created_at DESC);

-- RLS-г шинэчлэх: бүх нэвтэрсэн хэрэглэгч 'public' room уншиж/бичнэ
DROP POLICY IF EXISTS "chat_select_own_tier" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_select_public" ON public.chat_messages;
CREATE POLICY "chat_select_public" ON public.chat_messages
  FOR SELECT
  USING (
    room = 'public'
    AND is_deleted = false
    AND auth.uid() IS NOT NULL
  );

-- INSERT policy шинэчлэх — 0008-ийн rate limit-ийг үлдээж зөвхөн room='public' болгох
DROP POLICY IF EXISTS "chat_insert_own_tier" ON public.chat_messages;
CREATE POLICY "chat_insert_public" ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND room = 'public'
    -- Сүүлийн 2 секундэд бичсэн мессежгүй байх
    AND NOT EXISTS (
      SELECT 1 FROM public.chat_messages
      WHERE user_id = auth.uid()
        AND created_at > now() - interval '2 seconds'
    )
    AND length(content) > 0
    AND length(content) <= 2000
    AND length(trim(content)) > 0
  );
