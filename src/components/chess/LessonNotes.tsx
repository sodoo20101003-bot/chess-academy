'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface LessonNotesProps {
  lessonId: string
  initialContent?: string
  className?: string
}

type SaveStatus = 'idle' | 'editing' | 'saving' | 'saved'

export function LessonNotes({ lessonId, initialContent = '', className }: LessonNotesProps) {
  const [content, setContent] = useState(initialContent)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const supabase = useRef(createClient())
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const lastSavedRef = useRef(initialContent)

  const save = useCallback(async (text: string) => {
    if (text === lastSavedRef.current) {
      setStatus('saved')
      return
    }
    setStatus('saving')
    const { data: { user } } = await supabase.current.auth.getUser()
    if (!user) {
      setStatus('idle')
      return
    }

    const { error } = await supabase.current
      .from('lesson_notes')
      .upsert(
        { user_id: user.id, lesson_id: lessonId, content: text },
        { onConflict: 'user_id,lesson_id' }
      )

    if (!error) {
      lastSavedRef.current = text
      setStatus('saved')
      setTimeout(() => setStatus((s) => s === 'saved' ? 'idle' : s), 1500)
    } else {
      setStatus('idle')
    }
  }, [lessonId])

  // Debounced autosave
  useEffect(() => {
    if (status !== 'editing') return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(content), 800)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [content, status, save])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    setStatus('editing')
  }

  return (
    <div className={cn('glass rounded-2xl p-5 border border-white/10', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Pencil className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-white">Миний тэмдэглэл</h3>
        </div>
        <SaveIndicator status={status} />
      </div>

      <textarea
        value={content}
        onChange={handleChange}
        placeholder="Энэ хичээлийн талаар чухал зүйлсээ энд бичээрэй..."
        className={cn(
          'w-full min-h-[140px] resize-y bg-transparent',
          'text-sm text-white/90 placeholder:text-white/30',
          'focus:outline-none leading-relaxed'
        )}
      />

      {content.length > 0 && (
        <p className="text-xs text-white/30 mt-2 text-right">
          {content.length} тэмдэгт
        </p>
      )}
    </div>
  )
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <motion.div
      key={status}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-1.5 text-xs"
    >
      {status === 'editing' && (
        <span className="text-white/40">Бичиж байна...</span>
      )}
      {status === 'saving' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-white/50" />
          <span className="text-white/50">Хадгалж байна</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400">Хадгалагдсан</span>
        </>
      )}
    </motion.div>
  )
}
