-- =====================================================
-- 0004: Puzzle System + Real Rating (Glicko-style simplified)
-- =====================================================

-- Puzzle тэмдэглэгдсэн ширээний баганууд (зарим нь эхэн дээр байсан, баталгаажуулна)
DO $$
BEGIN
  -- Puzzle хүснэгтэд title нэмэх (UX-д харагдах нэр)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'puzzles' AND column_name = 'title_mn'
  ) THEN
    ALTER TABLE public.puzzles ADD COLUMN title_mn text;
  END IF;

  -- Solution-ыг UCI хэлбэрээр хадгална (e2e4 г.м.)
  -- Анхны schema solution_pgn байгаа — backward compatible
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'puzzles' AND column_name = 'solution_uci'
  ) THEN
    ALTER TABLE public.puzzles ADD COLUMN solution_uci text;
    -- solution_uci-г заавал шаарддаг болгох (шинэ оньсогуудад)
  END IF;

  -- Side to move (w/b)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'puzzles' AND column_name = 'side_to_move'
  ) THEN
    ALTER TABLE public.puzzles ADD COLUMN side_to_move text DEFAULT 'w'
      CHECK (side_to_move IN ('w', 'b'));
  END IF;
END $$;

-- ============================================
-- Puzzle attempts хүснэгтэд илүү field нэмэх
-- ============================================
DO $$
BEGIN
  -- Сурагчийн оруулсан хариу (зөв байсан эсэхийг шалгахаас гадна харах)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'puzzle_attempts' AND column_name = 'attempted_uci'
  ) THEN
    ALTER TABLE public.puzzle_attempts ADD COLUMN attempted_uci text;
  END IF;

  -- Сурагчийн рейтинг өөрчлөлт (Elo-ийн дельта)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'puzzle_attempts' AND column_name = 'rating_change'
  ) THEN
    ALTER TABLE public.puzzle_attempts ADD COLUMN rating_change int DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- Profile-д puzzle stat нэмэх (caching)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'puzzles_solved'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN puzzles_solved int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'puzzles_attempted'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN puzzles_attempted int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'puzzle_streak'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN puzzle_streak int DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- RPC: puzzle бод (хариуг шалгаад, рейтинг шинэчилнэ)
-- ============================================
-- Энгийн Elo алгоритм:
--   К = 32 (амьсгаатай шинэ тоглогч)
--   Хүлээгдэж буй оноо: E = 1 / (1 + 10^((R_opp - R_user) / 400))
--   Шинэ рейтинг: R' = R + K * (S - E)
--     S = 1 (зөв), 0 (буруу)
CREATE OR REPLACE FUNCTION public.solve_puzzle(
  p_puzzle_id uuid,
  p_attempted_uci text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_rating int;
  v_puzzle_rating int;
  v_solution text;
  v_correct boolean;
  v_expected_score float;
  v_actual_score float;
  v_k int := 32;
  v_rating_delta int;
  v_new_rating int;
  v_already_solved boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Puzzle мэдээлэл татах
  SELECT
    rating,
    COALESCE(solution_uci, solution_pgn)
  INTO v_puzzle_rating, v_solution
  FROM public.puzzles
  WHERE id = p_puzzle_id;

  IF v_solution IS NULL THEN
    RAISE EXCEPTION 'Puzzle not found';
  END IF;

  -- Хариу зөв эсэх
  v_correct := (lower(trim(p_attempted_uci)) = lower(trim(v_solution)));

  -- Хэрэглэгчийн одоогийн рейтинг
  SELECT rating INTO v_user_rating FROM public.profiles WHERE id = v_user_id;
  IF v_user_rating IS NULL THEN
    v_user_rating := 1200;
  END IF;

  -- Аль хэдийн зөв тайлсан эсэх (давхар оноогойд бүү ор)
  SELECT EXISTS(
    SELECT 1 FROM public.puzzle_attempts
    WHERE user_id = v_user_id AND puzzle_id = p_puzzle_id AND solved = true
  ) INTO v_already_solved;

  -- Elo тооцоолол (зөвхөн анх удаа бодвол рейтинг өөрчлөгдөнө)
  IF v_already_solved THEN
    v_rating_delta := 0;
    v_new_rating := v_user_rating;
  ELSE
    v_expected_score := 1.0 / (1.0 + power(10.0, (v_puzzle_rating - v_user_rating)::float / 400.0));
    v_actual_score := CASE WHEN v_correct THEN 1.0 ELSE 0.0 END;
    v_rating_delta := round(v_k * (v_actual_score - v_expected_score));
    v_new_rating := greatest(100, v_user_rating + v_rating_delta);
  END IF;

  -- Attempt бүртгэх
  INSERT INTO public.puzzle_attempts (user_id, puzzle_id, solved, attempted_uci, rating_change, attempts)
  VALUES (v_user_id, p_puzzle_id, v_correct, p_attempted_uci, v_rating_delta, 1);

  -- Profile-ийн рейтинг ба тоо шинэчлэх
  IF NOT v_already_solved THEN
    UPDATE public.profiles
    SET
      rating = v_new_rating,
      puzzles_attempted = COALESCE(puzzles_attempted, 0) + 1,
      puzzles_solved = COALESCE(puzzles_solved, 0) + (CASE WHEN v_correct THEN 1 ELSE 0 END),
      puzzle_streak = CASE
        WHEN v_correct THEN COALESCE(puzzle_streak, 0) + 1
        ELSE 0
      END
    WHERE id = v_user_id;
  END IF;

  RETURN json_build_object(
    'correct', v_correct,
    'rating_change', v_rating_delta,
    'new_rating', v_new_rating,
    'old_rating', v_user_rating,
    'puzzle_rating', v_puzzle_rating,
    'already_solved', v_already_solved
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.solve_puzzle(uuid, text) TO authenticated;

-- ============================================
-- Тохиромжтой puzzle сонгох (хэрэглэгчийн рейтингд ойролцоо)
-- ============================================
CREATE OR REPLACE FUNCTION public.next_puzzle_for_user()
RETURNS TABLE (
  id uuid,
  fen text,
  rating int,
  themes text[],
  description_mn text,
  side_to_move text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_rating int := 1200;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NOT NULL THEN
    SELECT COALESCE(rating, 1200) INTO v_user_rating
    FROM public.profiles WHERE id = v_user_id;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.fen,
    p.rating,
    p.themes,
    p.description_mn,
    COALESCE(p.side_to_move, 'w') AS side_to_move
  FROM public.puzzles p
  WHERE p.id NOT IN (
    SELECT pa.puzzle_id FROM public.puzzle_attempts pa
    WHERE pa.user_id = v_user_id AND pa.solved = true
  )
  ORDER BY abs(p.rating - v_user_rating) ASC, random()
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_puzzle_for_user() TO authenticated, anon;

-- ============================================
-- Leaderboard (top рейтинг)
-- ============================================
CREATE OR REPLACE VIEW public.puzzle_leaderboard AS
SELECT
  p.id,
  p.full_name,
  p.username,
  p.avatar_url,
  p.rating,
  p.puzzles_solved,
  p.puzzles_attempted,
  p.puzzle_streak,
  ROW_NUMBER() OVER (ORDER BY p.rating DESC) AS rank
FROM public.profiles p
WHERE COALESCE(p.puzzles_attempted, 0) >= 3
ORDER BY p.rating DESC
LIMIT 100;

GRANT SELECT ON public.puzzle_leaderboard TO authenticated, anon;

-- ============================================
-- Жишээ оньсого (sample seed data)
-- ============================================
-- Зөвхөн хоосон үед ажиллана, давхардуулахгүй
INSERT INTO public.puzzles (fen, solution_pgn, solution_uci, rating, themes, description_mn, side_to_move, title_mn)
SELECT * FROM (VALUES
  -- Mate in 1, эхний түвшин
  ('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
   'Qxf7#', 'h5f7', 800, ARRAY['mate', 'mate-in-1'],
   'Цагаан хааныг гаргаж матлах. Нэг нүүдэлд мат.', 'w', 'Хоньчны мат'),

  -- Fork
  ('r2qkb1r/ppp2ppp/2n5/3np3/8/2N5/PPPP1PPP/R1BQKB1R w KQkq - 0 6',
   'Nxd5', 'c3d5', 1100, ARRAY['fork', 'tactics'],
   'Морь д5-д орж хоёр модыг хаширлана.', 'w', 'Морины хаширлал'),

  -- Pin
  ('rnbqkbnr/ppp2ppp/8/3pp3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
   'Bb5+', 'f1b5', 1000, ARRAY['pin', 'tactics'],
   'Цагаан зэвсэг хааныг хайчлан моринд дайрна.', 'w', 'Хайч'),

  -- Discovered attack
  ('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3',
   'Ng5', 'f3g5', 1200, ARRAY['discovered-attack', 'tactics'],
   'Морь нүүхэд биш хоёр модыг сүрдүүлнэ.', 'w', 'Нэвт халдлага'),

  -- Mate in 1 #2
  ('6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
   'Re8#', 'e1e8', 900, ARRAY['mate', 'mate-in-1', 'back-rank'],
   'Зад мөрний мат.', 'w', 'Зад мөрний мат')
) AS new_puzzles(fen, solution_pgn, solution_uci, rating, themes, description_mn, side_to_move, title_mn)
WHERE NOT EXISTS (SELECT 1 FROM public.puzzles LIMIT 1);

-- Index for leaderboard performance
CREATE INDEX IF NOT EXISTS idx_profiles_rating_solved ON public.profiles(rating DESC, puzzles_solved DESC);

-- Анхны 1200 биш хэрэглэгчдийг init хийх (нөхцөл нь зөвхөн NULL утгатай хэрэглэгчдийг)
UPDATE public.profiles
SET
  puzzles_solved = COALESCE(puzzles_solved, 0),
  puzzles_attempted = COALESCE(puzzles_attempted, 0),
  puzzle_streak = COALESCE(puzzle_streak, 0)
WHERE puzzles_solved IS NULL OR puzzles_attempted IS NULL OR puzzle_streak IS NULL;
