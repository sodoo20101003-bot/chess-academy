import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus, Edit, ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default async function AdminLessonsPage() {
  const supabase = await createClient();

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, title_mn, slug, level, required_tier, is_free, course_id, courses(title, title_mn)')
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto px-6 py-12 max-w-6xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Admin Dashboard
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-medium">Хичээлүүд</h1>
          <p className="text-white/50 mt-2">Хичээл засах, нийтлэх</p>
        </div>
        <Link href="/admin/lessons/new">
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            Шинэ хичээл
          </Button>
        </Link>
      </div>

      {!lessons || lessons.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 mb-6">Одоохондоо хичээл байхгүй байна.</p>
          <Link href="/admin/lessons/new">
            <Button variant="primary">Эхний хичээлээ үүсгэх</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(lessons as any[]).map((lesson: any) => {
            const course = lesson.courses as { title: string; title_mn: string | null } | null;
            return (
              <div
                key={lesson.id}
                className="glass rounded-2xl p-5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-white truncate">
                      {lesson.title_mn || lesson.title}
                    </h3>
                    {lesson.is_free && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        Үнэгүй
                      </span>
                    )}
                    {lesson.level && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60">
                        {lesson.level === 'beginner' ? 'Анхан' : lesson.level === 'intermediate' ? 'Дунд' : 'Ахисан'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/40">
                    {course?.title_mn || course?.title || '— курсгүй —'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/lesson/${lesson.id}`}>
                    <Button variant="outline" size="sm">Үзэх</Button>
                  </Link>
                  <Link href={`/admin/lessons/${lesson.id}/edit`}>
                    <Button variant="primary" size="sm">
                      <Edit className="h-3.5 w-3.5" />
                      Засах
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
