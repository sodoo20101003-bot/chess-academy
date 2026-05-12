import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditLessonClient } from './EditLessonClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminLessonEditPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .single();

  if (!lesson) notFound();

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, title_mn')
    .order('order_index');

  return <EditLessonClient lesson={lesson} courses={courses ?? []} />;
}
