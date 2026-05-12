-- ============================================================
-- Migration 0002 — Lesson Exercises & Personal Notes
-- ============================================================
-- This migration adds:
-- 1. lessons.exercises (jsonb) — Interactive checkpoint exercises within lessons
-- 2. lesson_notes — Personal notes that students keep per-lesson
-- 3. exercise_attempts — Track attempts on lesson exercises
-- ============================================================

-- 1. Add exercises field to lessons
alter table public.lessons
  add column if not exists exercises jsonb default '[]'::jsonb;

-- 1b. Add is_published to lessons (used by course detail page)
alter table public.lessons
  add column if not exists is_published boolean default true;

-- 1c. Add duration_seconds (used by course detail UI)
alter table public.lessons
  add column if not exists duration_seconds int;

comment on column public.lessons.exercises is
  'Array of interactive exercises (find-the-move, multiple-choice, etc.) embedded in the lesson.
  Each exercise has shape: {
    id: string,
    type: "find-best-move" | "find-mate" | "multiple-choice",
    fen: string,
    prompt_mn: string,
    solution: string (UCI move) | string[] (move sequence),
    options?: { label_mn: string, value: string, correct: boolean }[],
    hint_mn?: string,
    explanation_mn?: string,
    points?: number
  }';

-- 2. Personal lesson notes
create table if not exists public.lesson_notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  content text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, lesson_id)
);

alter table public.lesson_notes enable row level security;

create policy "Users manage own notes"
  on public.lesson_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists lesson_notes_user_lesson_idx
  on public.lesson_notes(user_id, lesson_id);

create trigger lesson_notes_updated_at
  before update on public.lesson_notes
  for each row execute function public.set_updated_at();

-- 3. Exercise attempts tracking
create table if not exists public.exercise_attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  exercise_id text not null,                      -- ID from the exercises jsonb
  attempted_move text not null,
  is_correct boolean not null,
  hints_used int default 0,
  points_earned int default 0,
  created_at timestamptz default now()
);

alter table public.exercise_attempts enable row level security;

create policy "Users see own attempts"
  on public.exercise_attempts for select
  using (auth.uid() = user_id);

create policy "Users insert own attempts"
  on public.exercise_attempts for insert
  with check (auth.uid() = user_id);

create index if not exists exercise_attempts_user_lesson_idx
  on public.exercise_attempts(user_id, lesson_id);

create index if not exists exercise_attempts_user_exercise_idx
  on public.exercise_attempts(user_id, exercise_id);

-- 4. Helper function: best (first-try, no-hint) attempts per lesson
create or replace function public.lesson_exercise_score(
  p_user_id uuid,
  p_lesson_id uuid
) returns table (
  exercise_id text,
  best_correct boolean,
  total_attempts int,
  total_points int
) language sql stable as $$
  select
    exercise_id,
    bool_or(is_correct) as best_correct,
    count(*)::int as total_attempts,
    coalesce(max(points_earned), 0)::int as total_points
  from public.exercise_attempts
  where user_id = p_user_id and lesson_id = p_lesson_id
  group by exercise_id
$$;
