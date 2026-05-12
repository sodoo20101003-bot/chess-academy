-- ============================================================
-- GrandMaster.mn — Database Schema
-- PostgreSQL / Supabase
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES (auth.users-тэй холбогдоно)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  username text unique,
  bio text,
  rating int default 1200,
  country text default 'MN',
  language text default 'mn',
  role text default 'student' check (role in ('student', 'teacher', 'admin')),
  subscription_tier text default 'free' check (subscription_tier in ('free', 'basic', 'pro', 'grandmaster')),
  subscription_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. COURSES
-- ============================================================
create table public.courses (
  id uuid default uuid_generate_v4() primary key,
  slug text unique not null,
  title text not null,
  title_mn text,
  description text,
  description_mn text,
  category text not null check (category in (
    'beginner', 'intermediate', 'advanced',
    'openings', 'middlegame', 'endgame', 'tactics', 'strategy'
  )),
  difficulty int default 1 check (difficulty between 1 and 5),
  thumbnail_url text,
  required_tier text default 'free' check (required_tier in ('free', 'basic', 'pro', 'grandmaster')),
  teacher_id uuid references public.profiles(id),
  total_lessons int default 0,
  total_duration_minutes int default 0,
  is_published boolean default false,
  order_index int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.courses enable row level security;

create policy "Published courses are viewable by everyone"
  on public.courses for select using (is_published = true);

create policy "Teachers/admins can manage courses"
  on public.courses for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('teacher', 'admin')
    )
  );

-- ============================================================
-- 3. LESSONS — багш контент оруулдаг газар
-- ============================================================
create table public.lessons (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  slug text not null,
  title text not null,
  title_mn text,
  description text,
  content_mn text,                         -- Багшийн бичсэн text content (markdown)
  video_url text,                          -- Supabase Storage эсвэл Mux URL
  video_duration_seconds int,
  starting_fen text,                       -- Эхлэлийн позиц (FEN notation)
  pgn text,                                -- Багшийн нүүдлүүд (PGN format)
  annotations jsonb default '[]'::jsonb,   -- Move-н тайлбар, сум, highlight
  order_index int default 0,
  is_free boolean default false,
  required_tier text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(course_id, slug)
);

alter table public.lessons enable row level security;

create policy "Free lessons viewable by all"
  on public.lessons for select using (is_free = true);

create policy "Premium lessons require subscription"
  on public.lessons for select using (
    is_free = true
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
      and (
        subscription_tier = 'grandmaster'
        or (required_tier = 'basic' and subscription_tier in ('basic', 'pro', 'grandmaster'))
        or (required_tier = 'pro' and subscription_tier in ('pro', 'grandmaster'))
      )
      and (subscription_expires_at is null or subscription_expires_at > now())
    )
  );

create policy "Teachers/admins can manage lessons"
  on public.lessons for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('teacher', 'admin')
    )
  );

-- ============================================================
-- 4. LESSON PROGRESS — хэрэглэгчийн ахиц
-- ============================================================
create table public.lesson_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  completed boolean default false,
  watch_seconds int default 0,
  last_position_fen text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

create policy "Users see own progress"
  on public.lesson_progress for select using (auth.uid() = user_id);

create policy "Users update own progress"
  on public.lesson_progress for all using (auth.uid() = user_id);

-- ============================================================
-- 5. PUZZLES — өдрийн оньсого
-- ============================================================
create table public.puzzles (
  id uuid default uuid_generate_v4() primary key,
  fen text not null,
  solution_pgn text not null,
  rating int default 1500,
  themes text[] default '{}',
  description_mn text,
  is_daily boolean default false,
  daily_date date,
  created_at timestamptz default now()
);

alter table public.puzzles enable row level security;

create policy "Puzzles viewable by all"
  on public.puzzles for select using (true);

-- User's puzzle attempts
create table public.puzzle_attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  puzzle_id uuid references public.puzzles(id) on delete cascade not null,
  solved boolean,
  attempts int default 1,
  time_spent_seconds int,
  created_at timestamptz default now()
);

alter table public.puzzle_attempts enable row level security;

create policy "Users see own attempts"
  on public.puzzle_attempts for all using (auth.uid() = user_id);

-- ============================================================
-- 6. SUBSCRIPTIONS & PAYMENTS (QPay)
-- ============================================================
create table public.subscription_plans (
  id text primary key,                    -- 'basic_monthly', 'pro_yearly' гм
  tier text not null check (tier in ('basic', 'pro', 'grandmaster')),
  billing_period text not null check (billing_period in ('monthly', 'yearly')),
  price_mnt int not null,
  name_mn text not null,
  description_mn text,
  features jsonb default '[]'::jsonb,
  is_active boolean default true
);

-- Default plans
insert into public.subscription_plans (id, tier, billing_period, price_mnt, name_mn, description_mn, features) values
  ('basic_monthly', 'basic', 'monthly', 29000, 'Basic Сар', 'Сар бүрийн төлбөр', '["Бүх анхан шатны хичээл", "Өдрийн оньсого", "Прогресс tracking"]'),
  ('pro_monthly', 'pro', 'monthly', 59000, 'Pro Сар', 'Сар бүрийн төлбөр', '["Бүх Basic feature", "Дунд + ахисан хичээл", "Engine analysis", "Багшаас зөвлөгөө"]'),
  ('grandmaster_monthly', 'grandmaster', 'monthly', 99000, 'Grandmaster Сар', 'Хамгийн дээд төвшин', '["Бүх Pro feature", "1-on-1 хичээл", "Tournament оролцоо", "Priority support"]'),
  ('basic_yearly', 'basic', 'yearly', 290000, 'Basic Жил', 'Жилийн төлбөр (2 сар үнэгүй)', '["Бүх анхан шатны хичээл", "Өдрийн оньсого"]'),
  ('pro_yearly', 'pro', 'yearly', 590000, 'Pro Жил', 'Жилийн төлбөр (2 сар үнэгүй)', '["Бүх Pro feature", "Engine analysis"]'),
  ('grandmaster_yearly', 'grandmaster', 'yearly', 990000, 'Grandmaster Жил', 'Хамгийн дээд', '["1-on-1 хичээл", "Tournament"]');

create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  plan_id text references public.subscription_plans(id) not null,
  amount_mnt int not null,
  status text default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded', 'expired')),
  qpay_invoice_id text unique,
  qpay_payment_id text,
  qpay_qr_text text,
  qpay_qr_image text,
  paid_at timestamptz,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '15 minutes')
);

alter table public.payments enable row level security;

create policy "Users see own payments"
  on public.payments for select using (auth.uid() = user_id);

-- ============================================================
-- 7. ACHIEVEMENTS & GAMIFICATION
-- ============================================================
create table public.achievements (
  id text primary key,
  name_mn text not null,
  description_mn text,
  icon text,
  points int default 10
);

insert into public.achievements (id, name_mn, description_mn, icon, points) values
  ('first_lesson', 'Анхны алхам', 'Эхний хичээлээ дуусгасан', '🎯', 10),
  ('streak_7', '7 хоногийн streak', '7 өдөр дараалан суралцсан', '🔥', 50),
  ('puzzle_master_10', 'Оньсого мастер', '10 оньсого зөв тайлсан', '🧩', 30),
  ('first_purchase', 'Premium гишүүн', 'Subscription авсан', '⭐', 100);

create table public.user_achievements (
  user_id uuid references public.profiles(id) on delete cascade,
  achievement_id text references public.achievements(id) on delete cascade,
  earned_at timestamptz default now(),
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

create policy "Users see all achievements"
  on public.user_achievements for select using (true);

-- ============================================================
-- 8. INDEXES (performance)
-- ============================================================
create index idx_lessons_course on public.lessons(course_id, order_index);
create index idx_progress_user on public.lesson_progress(user_id);
create index idx_courses_published on public.courses(is_published, category);
create index idx_payments_user on public.payments(user_id, status);
create index idx_payments_qpay on public.payments(qpay_invoice_id);
create index idx_puzzles_daily on public.puzzles(daily_date) where is_daily = true;
create index idx_profiles_rating on public.profiles(rating desc);

-- ============================================================
-- 9. FUNCTIONS (helpers)
-- ============================================================

-- Идэвхтэй subscription байгаа эсэхийг шалгах
create or replace function public.has_active_subscription(user_id uuid, required_tier text)
returns boolean as $$
declare
  user_tier text;
  user_expires timestamptz;
begin
  select subscription_tier, subscription_expires_at
  into user_tier, user_expires
  from public.profiles where id = user_id;

  if user_expires is not null and user_expires < now() then
    return false;
  end if;

  return case
    when required_tier = 'free' then true
    when required_tier = 'basic' then user_tier in ('basic', 'pro', 'grandmaster')
    when required_tier = 'pro' then user_tier in ('pro', 'grandmaster')
    when required_tier = 'grandmaster' then user_tier = 'grandmaster'
    else false
  end;
end;
$$ language plpgsql security definer;

-- updated_at автоматаар update хийх
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();
create trigger lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();
create trigger progress_updated_at before update on public.lesson_progress
  for each row execute function public.set_updated_at();
