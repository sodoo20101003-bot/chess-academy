import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ChessBoard } from '@/components/chess/ChessBoard'
import { ExerciseAttemptClient } from '@/components/chess/ExerciseAttemptClient'
import { LessonNotes } from '@/components/chess/LessonNotes'
import { LessonCompletion } from '@/components/chess/LessonCompletion'
import { AskTeacher } from '@/components/lesson/AskTeacher'
import { LessonAttachments } from '@/components/lesson/LessonAttachments'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import type { Exercise } from '@/components/chess/ExerciseWidget'
import { getEffectiveTier, canAccessLesson, type PlanTier, type CourseLevel, TIER_LABEL_MN } from '@/lib/plan-access'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LessonPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('*, courses(id, slug, title, title_mn, level)')
    .eq('id', id)
    .single()

  if (!lesson) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch user profile for tier check
  let userTier: PlanTier = 'free'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', user.id)
      .single()
    userTier = getEffectiveTier(profile as { subscription_tier: PlanTier | null; subscription_expires_at: string | null } | null)
  }

  // Access check: free flag OR tier matches level
  const lessonLevel: CourseLevel = (lesson.level ?? lesson.courses?.level ?? 'beginner') as CourseLevel
  const hasAccess = canAccessLesson(userTier, {
    is_free: lesson.is_free,
    level: lessonLevel,
    required_tier: lesson.required_tier,
  })

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-ink-950">
        <Navbar />
        <main className="min-h-screen flex items-center justify-center px-6 pt-32 pb-20">
          <div className="glass-strong rounded-3xl p-12 max-w-lg text-center border border-gold-500/20">
            <Lock className="h-12 w-12 text-gold-400 mx-auto mb-6" />
            <h1 className="font-display text-3xl mb-3 text-white">Премиум контент</h1>
            <p className="text-white/60 mb-8">
              Энэ хичээл нь <span className="text-gold-400 font-medium">{TIER_LABEL_MN[lessonLevel]}</span> түвшний бөгөөд{' '}
              {lessonLevel === 'intermediate' && (
                <span className="text-emerald-400 font-medium">Basic</span>
              )}
              {lessonLevel === 'advanced' && (
                <span className="text-emerald-400 font-medium">Pro</span>
              )}
              {' '}гишүүнчлэл шаардлагатай.
            </p>
            <Link href="/pricing">
              <Button variant="gold" size="lg">Гишүүнчлэл сонгох</Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Fetch user's lesson data in parallel
  const [progressResult, notesResult, nextLessonResult, exerciseScoresResult] = await Promise.all([
    user ? supabase
      .from('lesson_progress')
      .select('completed')
      .eq('user_id', user.id)
      .eq('lesson_id', lesson.id)
      .maybeSingle() : Promise.resolve({ data: null }),

    user ? supabase
      .from('lesson_notes')
      .select('content')
      .eq('user_id', user.id)
      .eq('lesson_id', lesson.id)
      .maybeSingle() : Promise.resolve({ data: null }),

    supabase
      .from('lessons')
      .select('id, title_mn, title')
      .eq('course_id', lesson.course_id)
      .gt('order_index', lesson.order_index)
      .order('order_index', { ascending: true })
      .limit(1)
      .maybeSingle(),

    user ? supabase
      .rpc('lesson_exercise_score', { p_user_id: user.id, p_lesson_id: lesson.id }) : Promise.resolve({ data: null }),
  ])

  const progress = progressResult.data
  const notes = notesResult.data
  const nextLesson = nextLessonResult.data
  const exerciseScores = exerciseScoresResult.data

  const exercises: Exercise[] = Array.isArray(lesson.exercises) ? lesson.exercises : []
  const totalExercisePoints = exercises.reduce((sum, ex) => sum + (ex.points ?? 10), 0)
  const earnedExercisePoints = (exerciseScores ?? []).reduce(
    (sum: number, s: { total_points: number }) => sum + (s.total_points ?? 0),
    0
  )

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar />
      <main className="pt-28 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          <Link
            href={`/courses/${lesson.courses?.slug ?? ''}`}
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {lesson.courses?.title_mn ?? lesson.courses?.title ?? 'Хичээлүүд'}
          </Link>

          <header className="mb-8 max-w-4xl">
            <h1 className="font-display text-4xl md:text-5xl text-white mb-3">
              {lesson.title_mn ?? lesson.title}
            </h1>
            {lesson.description && (
              <p className="text-lg text-white/60 leading-relaxed">{lesson.description}</p>
            )}
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
            {/* Main column */}
            <div className="space-y-8 min-w-0">
              {lesson.video_url && (
                <div className="aspect-video rounded-2xl overflow-hidden glass border border-white/10">
                  <video
                    src={lesson.video_url}
                    controls
                    controlsList="nodownload"
                    disablePictureInPicture
                    className="w-full h-full"
                  />
                </div>
              )}

              <ChessBoard
                initialFen={lesson.starting_fen ?? undefined}
                pgn={lesson.pgn ?? undefined}
                annotations={lesson.annotations ?? []}
                interactive={!lesson.pgn}
              />

              {/* Lesson content */}
              {lesson.content_mn && (
                <article className="glass rounded-2xl p-8 border border-white/10">
                  <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-4">
                    Багшийн тайлбар
                  </p>
                  <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-white/80">
                    {lesson.content_mn}
                  </div>
                </article>
              )}

              {/* Exercises */}
              {exercises.length > 0 && (
                <section>
                  <div className="flex items-baseline justify-between mb-6">
                    <h2 className="font-display text-3xl text-white">
                      Дасгал ({exercises.length})
                    </h2>
                    {totalExercisePoints > 0 && (
                      <span className="text-sm text-white/50 font-mono">
                        {earnedExercisePoints} / {totalExercisePoints} оноо
                      </span>
                    )}
                  </div>

                  <div className="space-y-6">
                    {exercises.map((ex, i) => (
                      <div key={ex.id ?? i}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-sm font-mono text-emerald-300">
                            {i + 1}
                          </div>
                          <div className="h-px bg-white/10 flex-1" />
                        </div>
                        <ExerciseAttemptClient
                          exercise={ex}
                          lessonId={lesson.id}
                          userId={user?.id ?? null}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right sidebar */}
            <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
              {user && (
                <LessonCompletion
                  lessonId={lesson.id}
                  isCompleted={progress?.completed ?? false}
                  nextLessonId={nextLesson?.id ?? null}
                  nextLessonTitle={nextLesson?.title_mn ?? nextLesson?.title ?? null}
                  totalExercisePoints={totalExercisePoints}
                  earnedExercisePoints={earnedExercisePoints}
                />
              )}

              {user && (
                <LessonNotes
                  lessonId={lesson.id}
                  initialContent={notes?.content ?? ''}
                />
              )}

              {/* Lesson attachments — Basic+ */}
              {user && Array.isArray(lesson.attachments) && lesson.attachments.length > 0 && (
                <LessonAttachments
                  lessonId={lesson.id}
                  userId={user.id}
                  userTier={userTier}
                  attachments={lesson.attachments}
                />
              )}

              {/* Ask teacher — Basic+ */}
              {user && (
                <AskTeacher
                  lessonId={lesson.id}
                  userId={user.id}
                  userTier={userTier}
                />
              )}
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
