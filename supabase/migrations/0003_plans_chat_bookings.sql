-- =====================================================
-- 0003: Plan logic + Public chat + Downloads + 1-on-1
-- =====================================================

-- Course-д level field нэмэх (хэрэв байхгүй бол)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'level'
  ) THEN
    ALTER TABLE courses ADD COLUMN level text DEFAULT 'beginner'
      CHECK (level IN ('beginner', 'intermediate', 'advanced'));
  END IF;
END $$;

-- Lesson-д level inherit хийх (course-аас) + downloadable flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'level'
  ) THEN
    ALTER TABLE lessons ADD COLUMN level text DEFAULT 'beginner'
      CHECK (level IN ('beginner', 'intermediate', 'advanced'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'attachments'
  ) THEN
    -- jsonb array of {url, name, type, size} for PDF/images attached by teachers
    ALTER TABLE lessons ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'is_downloadable'
  ) THEN
    ALTER TABLE lessons ADD COLUMN is_downloadable boolean DEFAULT true;
  END IF;
END $$;

-- =====================================================
-- PUBLIC CHAT — tier-ээр тусгаарласан өрөөнүүд
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room text NOT NULL CHECK (room IN ('basic', 'pro', 'grandmaster')),
  content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Зөвхөн өөрийн tier-ийнхээ өрөөг үзэх
CREATE POLICY "chat_read_own_tier" ON chat_messages
  FOR SELECT
  USING (
    is_deleted = false
    AND room = (
      SELECT subscription_tier FROM profiles
      WHERE id = auth.uid()
        AND subscription_tier IN ('basic', 'pro', 'grandmaster')
        AND subscription_expires_at > now()
    )
  );

-- Зөвхөн өөрийн tier-ийнхээ өрөөнд бичих
CREATE POLICY "chat_insert_own_tier" ON chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND room = (
      SELECT subscription_tier FROM profiles
      WHERE id = auth.uid()
        AND subscription_tier IN ('basic', 'pro', 'grandmaster')
        AND subscription_expires_at > now()
    )
  );

-- Өөрийн мессежээ устгах
CREATE POLICY "chat_delete_own" ON chat_messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TEACHER 1-on-1 BOOKINGS (Pro plan, monthly)
-- =====================================================

CREATE TABLE IF NOT EXISTS teacher_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_type text NOT NULL CHECK (session_type IN ('video', 'chat')),
  scheduled_at timestamptz NOT NULL,
  duration_minutes int DEFAULT 60,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  meeting_url text,            -- Zoom/Meet link if video
  notes_user text,             -- хэрэглэгчийн юу яримаар байгаа
  notes_teacher text,          -- багшийн session notes
  month_used text NOT NULL,    -- '2026-05' формат — нэг сар нэг л booking-той
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_user_month
  ON teacher_bookings(user_id, month_used)
  WHERE status NOT IN ('cancelled');

CREATE INDEX IF NOT EXISTS idx_bookings_teacher ON teacher_bookings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled ON teacher_bookings(scheduled_at);

ALTER TABLE teacher_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_user_read" ON teacher_bookings
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = teacher_id);

CREATE POLICY "bookings_user_insert" ON teacher_bookings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND subscription_tier IN ('pro', 'grandmaster')
        AND subscription_expires_at > now()
    )
  );

CREATE POLICY "bookings_teacher_update" ON teacher_bookings
  FOR UPDATE USING (auth.uid() = teacher_id OR auth.uid() = user_id);

-- =====================================================
-- TEACHER QUESTIONS (Basic+ хэрэглэгч багшаас зөвлөгөө)
-- =====================================================

CREATE TABLE IF NOT EXISTS teacher_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
  question text NOT NULL CHECK (length(question) > 0),
  answer text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'answered', 'closed')),
  created_at timestamptz DEFAULT now(),
  answered_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_questions_user ON teacher_questions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_status ON teacher_questions(status, created_at);

ALTER TABLE teacher_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questions_user_read" ON teacher_questions
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = teacher_id);

CREATE POLICY "questions_user_insert" ON teacher_questions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND subscription_tier IN ('basic', 'pro', 'grandmaster')
        AND subscription_expires_at > now()
    )
  );

CREATE POLICY "questions_teacher_answer" ON teacher_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('teacher', 'admin')
    )
  );

-- =====================================================
-- LESSON DOWNLOADS — track who downloaded what
-- =====================================================

CREATE TABLE IF NOT EXISTS lesson_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  attachment_url text NOT NULL,
  downloaded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_downloads_user_lesson
  ON lesson_downloads(user_id, lesson_id);

ALTER TABLE lesson_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "downloads_user_read" ON lesson_downloads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "downloads_user_insert" ON lesson_downloads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Хэрэглэгчийн идэвхтэй tier (subscription дууссан бол free)
CREATE OR REPLACE FUNCTION user_active_tier(uid uuid)
RETURNS text AS $$
DECLARE
  result text;
BEGIN
  SELECT
    CASE
      WHEN subscription_expires_at IS NULL THEN 'free'
      WHEN subscription_expires_at < now() THEN 'free'
      ELSE COALESCE(subscription_tier, 'free')
    END
  INTO result
  FROM profiles
  WHERE id = uid;

  RETURN COALESCE(result, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATE PLAN FEATURES with new offering
-- =====================================================

UPDATE subscription_plans SET features = '[
  "Анхан шатны бүх хичээл",
  "Дунд шатны бүх хичээл",
  "Хичээл татах боломж",
  "Багшаас зөвлөгөө авах",
  "Public chat (Basic group)",
  "Өдрийн оньсого",
  "Прогресс tracking"
]'::jsonb WHERE tier = 'basic' AND billing_period = 'monthly';

UPDATE subscription_plans SET features = '[
  "Анхан + Дунд + Ахисан шатны бүх хичээл",
  "Хичээл татах боломж",
  "Багшаас зөвлөгөө авах",
  "1-on-1 багштай session (сард 1 удаа)",
  "Public chat (Pro group)",
  "Engine шинжилгээ",
  "Бүх дасгал, оньсого",
  "Priority support"
]'::jsonb WHERE tier = 'pro' AND billing_period = 'monthly';

UPDATE subscription_plans SET features = '[
  "Анхан шатны бүх хичээл",
  "Дунд шатны бүх хичээл",
  "Хичээл татах",
  "Багшаас зөвлөгөө",
  "Public chat",
  "2 сар үнэгүй"
]'::jsonb WHERE tier = 'basic' AND billing_period = 'yearly';

UPDATE subscription_plans SET features = '[
  "Бүх Pro онцлог",
  "1-on-1 багштай (сард 1 удаа)",
  "Engine шинжилгээ",
  "2 сар үнэгүй"
]'::jsonb WHERE tier = 'pro' AND billing_period = 'yearly';

-- =====================================================
-- STORAGE BUCKETS for lesson attachments
-- =====================================================
-- Run these in Supabase Dashboard manually if not auto-applied:
-- 1. Create bucket 'lesson-attachments' (public)
-- 2. Create bucket 'lesson-videos' (private, signed URLs)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-attachments',
  'lesson-attachments',
  true,
  52428800,  -- 50 MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload (admin will set RLS more restrictively)
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lesson-attachments');

CREATE POLICY "Anyone can read attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'lesson-attachments');
