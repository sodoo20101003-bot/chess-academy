// Энэ файлыг `supabase gen types typescript --project-id YOUR_ID > types/database.ts`
// командаар автомат үүсгэж болно. Гар хийсэн simplified version:

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          username: string | null;
          bio: string | null;
          rating: number;
          country: string;
          language: string;
          role: 'student' | 'teacher' | 'admin';
          subscription_tier: 'free' | 'basic' | 'pro' | 'grandmaster';
          subscription_expires_at: string | null;
          puzzles_solved: number;
          puzzles_attempted: number;
          puzzle_streak: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; email: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          slug: string;
          title: string;
          title_mn: string | null;
          description: string | null;
          description_mn: string | null;
          category: 'beginner' | 'intermediate' | 'advanced' | 'openings' | 'middlegame' | 'endgame' | 'tactics' | 'strategy';
          difficulty: number;
          thumbnail_url: string | null;
          cover_image_url: string | null;
          required_tier: 'free' | 'basic' | 'pro' | 'grandmaster';
          teacher_id: string | null;
          total_lessons: number;
          total_duration_minutes: number;
          is_published: boolean;
          order_index: number;
          level: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['courses']['Row']> & { slug: string; title: string; category: string };
        Update: Partial<Database['public']['Tables']['courses']['Row']>;
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          course_id: string;
          slug: string;
          title: string;
          title_mn: string | null;
          description: string | null;
          content_mn: string | null;
          video_url: string | null;
          video_duration_seconds: number | null;
          starting_fen: string | null;
          pgn: string | null;
          annotations: LessonAnnotation[];
          exercises: any[];
          attachments: any[];
          order_index: number;
          is_free: boolean;
          required_tier: 'free' | 'basic' | 'pro' | 'grandmaster';
          is_published: boolean;
          duration_seconds: number | null;
          level: string | null;
          is_downloadable: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['lessons']['Row']> & { course_id: string; slug: string; title: string };
        Update: Partial<Database['public']['Tables']['lessons']['Row']>;
        Relationships: [];
      };
      lesson_progress: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          completed: boolean;
          watch_seconds: number;
          last_position_fen: string | null;
          notes: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['lesson_progress']['Row']> & { user_id: string; lesson_id: string };
        Update: Partial<Database['public']['Tables']['lesson_progress']['Row']>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          amount_mnt: number;
          status: 'pending' | 'paid' | 'failed' | 'refunded' | 'expired';
          qpay_invoice_id: string | null;
          qpay_payment_id: string | null;
          qpay_qr_text: string | null;
          qpay_qr_image: string | null;
          paid_at: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: Partial<Database['public']['Tables']['payments']['Row']> & { user_id: string; plan_id: string; amount_mnt: number };
        Update: Partial<Database['public']['Tables']['payments']['Row']>;
        Relationships: [];
      };
      subscription_plans: {
        Row: {
          id: string;
          tier: 'basic' | 'pro' | 'grandmaster';
          billing_period: 'monthly' | 'yearly';
          price_mnt: number;
          name_mn: string;
          description_mn: string | null;
          features: string[];
          is_active: boolean;
        };
        Insert: Database['public']['Tables']['subscription_plans']['Row'];
        Update: Partial<Database['public']['Tables']['subscription_plans']['Row']>;
        Relationships: [];
      };
      lesson_notes: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; lesson_id: string; content?: string };
        Update: Partial<Database['public']['Tables']['lesson_notes']['Row']>;
        Relationships: [];
      };
      exercise_attempts: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          exercise_id: string;
          attempted_move: string;
          is_correct: boolean;
          hints_used: number;
          points_earned: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['exercise_attempts']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['exercise_attempts']['Row']>;
        Relationships: [];
      };
      puzzles: {
        Row: {
          id: string;
          fen: string;
          solution_pgn: string | null;
          solution_uci: string | null;
          rating: number;
          themes: string[] | null;
          description_mn: string | null;
          side_to_move: string | null;
          title_mn: string | null;
          is_daily: boolean;
          daily_date: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['puzzles']['Row']> & { fen: string };
        Update: Partial<Database['public']['Tables']['puzzles']['Row']>;
        Relationships: [];
      };
      puzzle_attempts: {
        Row: {
          id: string;
          user_id: string;
          puzzle_id: string;
          solved: boolean;
          attempts: number;
          time_spent_seconds: number | null;
          attempted_uci: string | null;
          rating_change: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['puzzle_attempts']['Row']> & { user_id: string; puzzle_id: string };
        Update: Partial<Database['public']['Tables']['puzzle_attempts']['Row']>;
        Relationships: [];
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_type: string;
          unlocked_at: string;
          metadata: Json | null;
        };
        Insert: Partial<Database['public']['Tables']['user_achievements']['Row']> & { user_id: string; achievement_type: string };
        Update: Partial<Database['public']['Tables']['user_achievements']['Row']>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          room: 'basic' | 'pro' | 'grandmaster';
          content: string;
          is_deleted: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['chat_messages']['Row']> & { user_id: string; room: string; content: string };
        Update: Partial<Database['public']['Tables']['chat_messages']['Row']>;
        Relationships: [];
      };
      teacher_bookings: {
        Row: {
          id: string;
          user_id: string;
          [k: string]: any;
        };
        Insert: { user_id: string; [k: string]: any };
        Update: { [k: string]: any };
        Relationships: [];
      };
    };
    Views: {
      puzzle_leaderboard: {
        Row: {
          id: string;
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
          rating: number;
          puzzles_solved: number;
          puzzles_attempted: number;
          puzzle_streak: number;
          rank: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      solve_puzzle: {
        Args: {
          p_puzzle_id: string;
          p_attempted_uci: string;
        };
        Returns: {
          correct: boolean;
          rating_change: number;
          new_rating: number;
          old_rating: number;
          puzzle_rating: number;
          already_solved: boolean;
        };
      };
      next_puzzle_for_user: {
        Args: Record<string, never>;
        Returns: Array<{
          id: string;
          fen: string;
          rating: number;
          themes: string[] | null;
          description_mn: string | null;
          side_to_move: string;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Lesson annotation type
export type LessonAnnotation = {
  moveIndex: number;
  comment_mn?: string;
  arrows?: Array<[string, string]>;
  highlights?: string[];
  evaluation?: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'brilliant';
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Course = Database['public']['Tables']['courses']['Row'];
export type Lesson = Database['public']['Tables']['lessons']['Row'];
export type LessonProgress = Database['public']['Tables']['lesson_progress']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row'];
export type Puzzle = Database['public']['Tables']['puzzles']['Row'];
export type PuzzleAttempt = Database['public']['Tables']['puzzle_attempts']['Row'];
