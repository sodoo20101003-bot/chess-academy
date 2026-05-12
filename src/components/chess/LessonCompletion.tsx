'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

interface LessonCompletionProps {
  lessonId: string
  isCompleted: boolean
  nextLessonId?: string | null
  nextLessonTitle?: string | null
  totalExercisePoints?: number
  earnedExercisePoints?: number
}

export function LessonCompletion({
  lessonId,
  isCompleted,
  nextLessonId,
  nextLessonTitle,
  totalExercisePoints = 0,
  earnedExercisePoints = 0,
}: LessonCompletionProps) {
  const router = useRouter()
  const [completed, setCompleted] = useState(isCompleted)
  const [isPending, startTransition] = useTransition()

  const handleComplete = () => {
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Нэвтрэх шаардлагатай')
        return
      }

      const { error } = await supabase
        .from('lesson_progress')
        .upsert(
          {
            user_id: user.id,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,lesson_id' }
        )

      if (error) {
        toast.error('Алдаа гарлаа')
        return
      }

      setCompleted(true)
      toast.success('Хичээл амжилттай дууслаа!')
      router.refresh()
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl p-6 border border-white/10"
    >
      {totalExercisePoints > 0 && (
        <div className="mb-4 pb-4 border-b border-white/10">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-sm text-white/60">Дасгалын оноо</span>
            <span className="font-mono text-emerald-400">
              {earnedExercisePoints} / {totalExercisePoints}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              initial={{ width: 0 }}
              animate={{
                width: `${totalExercisePoints > 0 ? (earnedExercisePoints / totalExercisePoints) * 100 : 0}%`,
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {completed ? (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-display text-xl text-white">Хичээл дууссан!</h3>
              <p className="text-sm text-white/50">Сайн ажиллаа.</p>
            </div>
          </div>

          {nextLessonId && (
            <Button
              onClick={() => router.push(`/lesson/${nextLessonId}`)}
              size="lg"
              className="w-full"
            >
              Дараагийн хичээл
              {nextLessonTitle && (
                <span className="ml-1 text-ink-950/70 hidden sm:inline">— {nextLessonTitle}</span>
              )}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      ) : (
        <div>
          <h3 className="font-display text-xl text-white mb-2">Хичээлээ дууссан уу?</h3>
          <p className="text-sm text-white/60 mb-4">
            Дууссан гэдгээ тэмдэглэж дараагийн хичээл рүү шилжээрэй.
          </p>
          <Button
            onClick={handleComplete}
            disabled={isPending}
            size="lg"
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Хадгалж байна...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Дууссан гэж тэмдэглэх
              </>
            )}
          </Button>
        </div>
      )}
    </motion.div>
  )
}
