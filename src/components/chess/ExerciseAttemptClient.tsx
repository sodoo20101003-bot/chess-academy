'use client'

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ExerciseWidget, type Exercise } from './ExerciseWidget'

interface ExerciseAttemptClientProps {
  exercise: Exercise
  lessonId: string
  userId: string | null
}

/**
 * Client wrapper around ExerciseWidget that persists attempts to the database.
 *
 * Used by the lesson page (which is a server component and cannot itself
 * pass the supabase client into ExerciseWidget).
 */
export function ExerciseAttemptClient({ exercise, lessonId, userId }: ExerciseAttemptClientProps) {
  const handleComplete = useCallback(
    async (result: { correct: boolean; hintsUsed: number; points: number }) => {
      if (!userId) return  // anonymous attempts don't get logged
      const supabase = createClient()
      await supabase.from('exercise_attempts').insert({
        user_id: userId,
        lesson_id: lessonId,
        exercise_id: exercise.id,
        attempted_move: '',  // would need to be passed from widget if we want to log it
        is_correct: result.correct,
        hints_used: result.hintsUsed,
        points_earned: result.points,
      })
    },
    [exercise.id, lessonId, userId]
  )

  return <ExerciseWidget exercise={exercise} onComplete={handleComplete} />
}
