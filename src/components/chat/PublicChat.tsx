'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PUBLIC_CHAT_ROOM } from '@/lib/plan-access';
import Link from 'next/link';

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface PublicChatProps {
  userId: string;
  userName?: string;
}

/**
 * PublicChat — Бүх нэвтэрсэн хэрэглэгчид нээлттэй ганц chat.
 *
 * Plan tier-аар хязгаарлахаа болив (хуучин Basic/Pro/GM-н тусгай room-ууд
 * нэгтгэгдсэн).
 */
export function PublicChat({ userId }: PublicChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileCacheRef = useRef<Map<string, { full_name?: string; avatar_url?: string }>>(new Map());

  const supabase = useMemo(() => createClient(), []);

  // Анхны мессежүүд + realtime
  useEffect(() => {
    if (!open) return;

    let active = true;

    const loadMessages = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('chat_messages')
        .select('id, user_id, content, created_at, profiles(full_name, avatar_url)')
        .eq('room', PUBLIC_CHAT_ROOM)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (active && data) {
        const formatted = (data as any[]).reverse().map((m) => {
          const profile = m.profiles
            ? { full_name: m.profiles.full_name, avatar_url: m.profiles.avatar_url }
            : undefined;
          if (profile && m.user_id) {
            profileCacheRef.current.set(m.user_id, profile);
          }
          return {
            id: m.id,
            user_id: m.user_id,
            content: m.content,
            created_at: m.created_at,
            user: profile,
          };
        });
        setMessages(formatted);
      }
      setLoading(false);
    };

    loadMessages();

    // Realtime — бүх public message
    const channel = supabase
      .channel(`chat:${PUBLIC_CHAT_ROOM}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room=eq.${PUBLIC_CHAT_ROOM}`,
        },
        async (payload) => {
          let profile = profileCacheRef.current.get(payload.new.user_id);

          if (!profile) {
            const { data } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', payload.new.user_id)
              .single();
            if (data) {
              profile = {
                full_name: (data as any).full_name,
                avatar_url: (data as any).avatar_url,
              };
              profileCacheRef.current.set(payload.new.user_id, profile);
            }
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [
              ...prev,
              {
                id: payload.new.id,
                user_id: payload.new.user_id,
                content: payload.new.content,
                created_at: payload.new.created_at,
                user: profile,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [open, supabase]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async () => {
    if (sending || !input.trim()) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    setError(null);

    try {
      const { error: err } = await supabase.from('chat_messages').insert({
        user_id: userId,
        room: PUBLIC_CHAT_ROOM,
        content,
      });

      if (err) {
        setInput(content);
        // RLS-аас rate limit-ийн алдаа гарвал ойлгомжтой мессеж
        if (err.message?.includes('row-level security')) {
          setError('Хэт хурдан илгээж байна — 2 секундийн дараа дахин үзнэ үү');
        } else {
          setError('Илгээх боломжгүй байна');
        }
        setTimeout(() => setError(null), 3000);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(!open)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-ink-950 shadow-2xl shadow-emerald-500/40 flex items-center justify-center transition-colors"
        aria-label="Chat нээх"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6" />
            </motion.span>
          ) : (
            <motion.span
              key="msg"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              className="text-2xl"
            >
              💬
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] rounded-2xl glass-strong border border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 bg-ink-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg text-white">
                    Олон нийтийн chat
                  </h3>
                  <p className="text-xs text-white/50">
                    Бүх гишүүдтэй нэгдсэн чат
                  </p>
                </div>
                <div className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">
                  Live
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {loading && (
                <div className="text-center text-white/40 text-sm py-8">Уншиж байна...</div>
              )}
              {!loading && messages.length === 0 && (
                <div className="text-center text-white/40 text-sm py-8">
                  Эхний мессежээ бичээрэй! 👋
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.user_id === userId;
                const displayName = msg.user?.full_name || 'Нэргүй';
                const initial = displayName.charAt(0).toUpperCase();
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Avatar (зүүн талд бусдын мессеж) */}
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/30 to-gold-500/30 flex items-center justify-center shrink-0 mt-4 overflow-hidden">
                        {msg.user?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={msg.user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-semibold text-white/80">{initial}</span>
                        )}
                      </div>
                    )}

                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <span className={`text-xs text-white/50 mb-1 px-1 ${isMe ? 'text-right' : ''}`}>
                        {isMe ? 'Та' : displayName}
                      </span>
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm break-words ${
                          isMe
                            ? 'bg-emerald-500 text-ink-950 rounded-br-sm'
                            : 'bg-white/10 text-white rounded-bl-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>

                    {/* Avatar (баруун талд миний мессеж) */}
                    {isMe && (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/40 flex items-center justify-center shrink-0 mt-4 overflow-hidden">
                        {msg.user?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={msg.user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-semibold text-white">{initial}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Error pill */}
            {error && (
              <div className="px-4 py-1 bg-red-500/10 border-t border-red-500/20 text-xs text-red-300 text-center">
                {error}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-white/10 bg-ink-900/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Мессеж бичих..."
                  maxLength={2000}
                  className="flex-1 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-ink-950 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Нэвтрээгүй хэрэглэгчид зориулсан "нэвтэрнэ үү" мессеж
 * (хуучин PublicChatLocked-ыг орлоно).
 */
export function PublicChatGuest() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Link
        href="/auth/login"
        className="group flex items-center gap-2 px-4 py-3 rounded-full glass border border-white/10 hover:border-emerald-500/40 transition-all shadow-xl"
      >
        <span className="text-sm text-white/80 group-hover:text-white">
          💬 Chat-нд орохын тулд нэвтэрнэ үү
        </span>
      </Link>
    </div>
  );
}
