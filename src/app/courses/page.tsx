import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CourseCard } from '@/components/courses/CourseCard'
import { CategoryFilter } from '@/components/courses/CategoryFilter'

export const metadata = {
  title: 'Хичээлүүд — GrandMaster.mn',
  description: 'Шатрын бүх түвшний хичээлүүдийг үзээрэй. Эхлэгчээс гросмастер хүртэл.',
}

interface PageProps {
  searchParams: Promise<{ category?: string }>
}

export default async function CoursesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('courses')
    .select('*, lessons(count)')
    .eq('is_published', true)
    .order('order_index', { ascending: true })

  if (params.category) {
    query = query.eq('category', params.category)
  }

  const { data: courses } = await query

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-6">
          <header className="max-w-3xl mb-12">
            <p className="text-sm font-mono text-emerald-400 uppercase tracking-widest mb-4">
              Бүх хичээлүүд
            </p>
            <h1 className="font-display text-5xl md:text-6xl text-white mb-6">
              Шатрын <em className="italic text-gold-400">мастер</em> болох зам
            </h1>
            <p className="text-lg text-white/60 leading-relaxed">
              Эхлэгчийн алхамаас гросмастерийн стратеги хүртэл — бид таныг бүх замд нь дагалдан явна.
            </p>
          </header>

          <CategoryFilter active={params.category} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {courses?.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          {courses?.length === 0 && (
            <div className="text-center py-24">
              <p className="text-white/40">Энэ ангилалд хичээл хараахан байхгүй байна.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
