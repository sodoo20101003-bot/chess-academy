'use client';

import { Download, FileText, Image as ImageIcon, File, Lock } from 'lucide-react';
import Link from 'next/link';
import { canAccessLesson, type PlanTier } from '@/lib/plan-access';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Attachment {
  url: string;
  name: string;
  type: 'pdf' | 'image' | 'video' | 'other';
  size?: number;
}

interface LessonAttachmentsProps {
  lessonId: string;
  userId: string;
  userTier: PlanTier;
  attachments: Attachment[];
}

const ICONS = {
  pdf: FileText,
  image: ImageIcon,
  video: File,
  other: File,
};

const formatBytes = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function LessonAttachments({
  lessonId,
  userId,
  userTier,
  attachments,
}: LessonAttachmentsProps) {
  const canDownload = canAccessLesson(userTier);
  const supabase = createClient();

  if (!attachments || attachments.length === 0) return null;

  const trackDownload = async (url: string) => {
    await supabase.from('lesson_downloads').insert({
      user_id: userId,
      lesson_id: lessonId,
      attachment_url: url,
    });
  };

  if (!canDownload) {
    return (
      <div className="rounded-2xl glass border border-white/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-gold-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-medium mb-1">
              Хичээлийн материал ({attachments.length} файл)
            </h3>
            <p className="text-sm text-white/60 mb-4">
              Татах боломж нь Basic болон түүнээс дээш гишүүнчлэлд хамаарна.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 text-sm transition-colors"
            >
              Гишүүнчлэл авах
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl glass border border-white/10 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Download className="w-5 h-5 text-emerald-400" />
        <h3 className="text-white font-medium">Татаж авах материалууд</h3>
      </div>

      <div className="space-y-2">
        {attachments.map((file, idx) => {
          const Icon = ICONS[file.type] || File;
          return (
            <a
              key={idx}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              download={file.name}
              onClick={() => trackDownload(file.url)}
              className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-400/30 hover:bg-white/[0.05] transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate group-hover:text-emerald-300 transition-colors">
                  {file.name}
                </p>
                {file.size && (
                  <p className="text-xs text-white/40">{formatBytes(file.size)}</p>
                )}
              </div>
              <Download className="w-4 h-4 text-white/40 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
