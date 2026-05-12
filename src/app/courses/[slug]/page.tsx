import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { Lock, PlayCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface PageProps {
  params: Promise<{ slug: string }>
}

const TIER_RANK: Record<string, number> = { free: 0, basic: 1, pro: 2, grandmaster: 3 }

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: course } = await supabase
    .from('courses')
    .select('title_mn, description_mn')
    .eq('slug', slug)
    .single()

  if (!course) return { title: 'Хичээл олдсонгүй' }

  return {
    title: `${course.title_mn} — GrandMaster.mn`,
    description: course.description_mn ?? undefined,
  }
}

export default async function CoursePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!course) notFound()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', course.id)
    .eq('is_published', true)
    .order('order_index', { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()

  let userTier = 'free'
  let completedLessonIds = new Set<string>()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', user.id)
      .single()

    if (
      profile?.subscription_tier &&
      profile.subscription_expires_at &&
      new Date(profile.subscription_expires_at) > new Date()
    ) {
      userTier = profile.subscription_tier
    }

    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', user.id)
      .eq('completed', true)

    completedLessonIds = new Set(progress?.map((p) => p.lesson_id) ?? [])
  }

  const userTierRank = TIER_RANK[userTier] ?? 0
  const courseTierRank = TIER_RANK[course.required_tier] ?? 0
  const hasAccess = userTierRank >= courseTierRank

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-6">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Бүх хичээлүүд
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
            <div>
              <p className="text-sm font-mono text-emerald-400 uppercase tracking-widest mb-4">
                {course.category}
              </p>
              <h1 className="font-display text-5xl md:text-6xl text-white mb-6">
                {course.title_mn}
              </h1>
              {course.description_mn && (
                <p className="text-lg text-white/70 leading-relaxed mb-12">
                  {course.description_mn}
                </p>
              )}

              <h2 className="font-display text-2xl text-white mb-6">
                Хичээлийн жагсаалт ({lessons?.length ?? 0})
              </h2>

              <div className="space-y-2">
                {lessons?.map((lesson, idx) => {
                  const lessonAccessible = lesson.is_free || hasAccess
                  const completed = completedLessonIds.has(lesson.id)

                  return (
                    <Link
                      key={lesson.id}
                      href={lessonAccessible ? `/lesson/${lesson.id}` : '/pricing'}
                      className="group flex items-center gap-4 p-4 rounded-xl glass border border-white/5 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-sm font-mono text-white/60">
                        {String(idx + 1).padStart(2, '0')}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white font-medium group-hover:text-emerald-300 transition-colors">
                            {lesson.title_mn}
                          </h3>
                          {lesson.is_free && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                              Үнэгүй
                            </span>
                          )}
                        </div>
                        {lesson.duration_seconds && (
                          <p className="text-xs text-white/40 mt-1">
                            {formatDuration(lesson.duration_seconds)}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {completed ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        ) : !lessonAccessible ? (
                          <Lock className="w-5 h-5 text-white/30" />
                        ) : (
                          <PlayCircle className="w-6 h-6 text-white/60 group-hover:text-emerald-400 transition-colors" />
                        )}
                      </div>
                    </Link>
                  )
                })}

                {lessons?.length === 0 && (
                  <p className="text-white/40 text-center py-12">
                    Хичээл хараахан нэмэгдээгүй байна.
                  </p>
                )}
              </div>
            </div>

            <aside className="lg:sticky lg:top-32 lg:self-start">
              <div className="rounded-2xl glass border border-white/10 overflow-hidden">
                <div className="aspect-video relative bg-gradient-to-br from-emerald-900/20 to-ink-900">
                  {course.cover_image_url ? (
                    <Image src={course.cover_image_url} alt={course.title_mn} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-display text-9xl text-white/5">♞</span>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {!hasAccess && course.required_tier !== 'free' ? (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <Lock className="w-4 h-4 text-gold-400" />
                        <span className="text-sm text-gold-300">
                          {course.required_tier} гишүүнчлэл шаардлагатай
                        </span>
                      </div>
                      <Link href="/pricing">
                        <Button variant="gold" size="lg" className="w-full">
                          Гишүүнчлэл сонгох
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      {lessons && lessons.length > 0 && (
                        <Link href={`/lesson/${lessons[0].id}`}>
                          <Button size="lg" className="w-full">
                            Эхлэх
                          </Button>
                        </Link>
                      )}
                    </>
                  )}

                  <dl className="mt-6 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-white/50">Хичээлийн тоо</dt>
                      <dd className="text-white">{lessons?.length ?? 0}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-white/50">Түвшин</dt>
                      <dd className="text-white capitalize">{course.category}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-white/50">Хэл</dt>
                      <dd className="text-white">Монгол</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
