'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  User, Camera, Lock, CreditCard, Calendar,
  ArrowLeft, Loader2, Check, Eye, EyeOff, Crown, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { TIER_LABEL_MN } from '@/lib/plan-access';

interface Props {
  user: { id: string; email: string };
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    subscription_tier: string | null;
    subscription_expires_at: string | null;
  } | null;
  payments: Array<{
    id: string;
    amount_mnt: number;
    status: string;
    created_at: string;
    paid_at: string | null;
    expires_at: string;
    subscription_plans: { name_mn: string; name: string } | null;
  }>;
  plans: Array<{
    id: string;
    tier: string;
    billing_period: string;
    price_mnt: number;
    name_mn: string;
  }>;
}

type Tab = 'profile' | 'password' | 'subscription' | 'payments';

export function AccountClient({ user, profile, payments, plans }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const tier = (profile?.subscription_tier || 'free') as keyof typeof TIER_LABEL_MN;
  const expiresAt = profile?.subscription_expires_at;
const hasActivePlan = (tier as string) !== 'free' && expiresAt && new Date(expiresAt) > new Date();

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Зурагны төрөл шалгах
    if (!file.type.startsWith('image/')) {
      toast.error('Зөвхөн зураг файл (JPG, PNG, GIF, WebP) сонгоно уу');
      return;
    }

    // Хэмжээ шалгах (5MB-ээс бага)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('Зургийн хэмжээ 5MB-ээс ихгүй байх ёстой');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.onerror = () => toast.error('Зургийг уншиж чадсангүй');
    reader.readAsDataURL(file);
  }

  async function handleProfileSave() {
    if (!fullName.trim()) {
      toast.error('Нэрээ оруулна уу');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    let newAvatarUrl = avatarUrl;

    if (avatarFile) {
      // Файлын ext-ыг найдвартайгаар олох
      const ext = (avatarFile.name.split('.').pop() || 'jpg').toLowerCase();
      const validExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      const finalExt = validExts.includes(ext) ? ext : 'jpg';

      // Хуучин cache-ийг алгасах cache buster
      const path = `${user.id}/avatar.${finalExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
          cacheControl: '3600',
        });

      if (uploadError) {
        toast.error('Avatar upload амжилтгүй: ' + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      // Cache buster нэмэх (browser хуучин зургийг харуулахгүй байх)
      newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), avatar_url: newAvatarUrl })
      .eq('id', user.id);

    setLoading(false);
    if (error) {
      toast.error('Хадгалахад алдаа гарлаа: ' + error.message);
    } else {
      setAvatarUrl(newAvatarUrl);
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success('Профайл шинэчлэгдлээ!');
      router.refresh();
    }
  }

  async function handlePasswordChange() {
    // Стресссэн валидаци
    if (!currentPassword) {
      toast.error('Одоогийн нууц үгээ оруулна уу');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Шинэ нууц үг таарахгүй байна');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Нууц үг хамгийн багадаа 8 тэмдэгт байна');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error('Нууц үг том үсэг, жижиг үсэг, тоо агуулсан байх ёстой');
      return;
    }
    if (currentPassword === newPassword) {
      toast.error('Шинэ нууц үг хуучнаас өөр байх ёстой');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Алхам 1: Одоогийн нууц үгийг шалгах (signInWithPassword нь дахин session үүсгэхгүй)
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      setLoading(false);
      toast.error('Одоогийн нууц үг буруу байна');
      return;
    }

    // Алхам 2: Шинэ нууц үг тохируулах
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Нууц үг амжилттай солигдлоо!');
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Профайл', icon: <User className="w-4 h-4" /> },
    { id: 'password', label: 'Нууц үг', icon: <Lock className="w-4 h-4" /> },
    { id: 'subscription', label: 'Гишүүнчлэл', icon: <Crown className="w-4 h-4" /> },
    { id: 'payments', label: 'Төлбөр', icon: <CreditCard className="w-4 h-4" /> },
  ];

  const displayAvatar = avatarPreview || avatarUrl || null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-24 pb-16 px-6">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Буцах
            </Link>
            <div>
              <h1 className="font-display text-3xl font-medium">Тохиргоо</h1>
              <p className="text-white/50 text-sm">{user.email}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-[220px_1fr] gap-6">
            {/* Sidebar tabs */}
            <div className="flex md:flex-col gap-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all text-left w-full ${
                    tab === t.id
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {t.icon}
                  <span className="hidden md:inline">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="glass-strong rounded-2xl p-6 md:p-8"
            >
              {/* PROFILE TAB */}
              {tab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-medium">Профайл мэдээлэл</h2>

                  {/* Avatar */}
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500/30">
                        {displayAvatar ? (
                          <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-emerald-900/40 flex items-center justify-center">
                            <User className="w-8 h-8 text-emerald-400" />
                          </div>
                        )}
                      </div>
                      <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-400 transition-colors">
                        <Camera className="w-3.5 h-3.5 text-ink-950" />
                        <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                      </label>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{fullName || 'Нэр оруулаагүй'}</p>
                      <p className="text-xs text-white/40 mt-1">Зургаа солихын тулд камерын дүрсэн дээр дарна уу</p>
                    </div>
                  </div>

                  {/* Full name */}
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Бүтэн нэр</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                      placeholder="Таны нэр"
                    />
                  </div>

                  {/* Email (readonly) */}
                  <div>
                    <label className="block text-sm text-white/70 mb-2">И-мэйл</label>
                    <input
                      type="email"
                      value={user.email}
                      readOnly
                      className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white/50 cursor-not-allowed"
                    />
                    <p className="text-xs text-white/30 mt-1">И-мэйл хаягийг өөрчлөх боломжгүй</p>
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleProfileSave}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Хадгалах
                  </Button>
                </div>
              )}

              {/* PASSWORD TAB */}
              {tab === 'password' && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-medium">Нууц үг солих</h2>
                  <p className="text-white/50 text-sm">Аюулгүй байдлын үүднээс одоогийн нууц үгээ оруулж шинээр сольж болно. Google-ээр нэвтэрсэн бол нууц үг тохируулж болно.</p>

                  <div className="space-y-4">
                    <div className="relative">
                      <label className="block text-sm text-white/70 mb-2">Одоогийн нууц үг</label>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        className="w-full h-12 px-4 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                        placeholder="Одоо ашиглаж буй нууц үг"
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-sm text-white/70 mb-2">Шинэ нууц үг</label>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full h-12 px-4 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                        placeholder="Хамгийн багадаа 8 тэмдэгт"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-[calc(50%+12px)] -translate-y-1/2 text-white/40 hover:text-white"
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm text-white/70 mb-2">Нууц үг давтах</label>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                        placeholder="Шинэ нууц үгийг дахин оруулна уу"
                      />
                    </div>

                    <div className="text-xs text-white/40 space-y-1">
                      <p>Нууц үгийн шаардлага:</p>
                      <ul className="list-disc list-inside space-y-0.5 pl-2">
                        <li className={newPassword.length >= 8 ? 'text-emerald-400' : ''}>Хамгийн багадаа 8 тэмдэгт</li>
                        <li className={/[A-Z]/.test(newPassword) ? 'text-emerald-400' : ''}>1+ том үсэг (A-Z)</li>
                        <li className={/[a-z]/.test(newPassword) ? 'text-emerald-400' : ''}>1+ жижиг үсэг (a-z)</li>
                        <li className={/[0-9]/.test(newPassword) ? 'text-emerald-400' : ''}>1+ тоо (0-9)</li>
                      </ul>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={handlePasswordChange}
                    disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                    className="flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Нууц үг солих
                  </Button>
                </div>
              )}

              {/* SUBSCRIPTION TAB */}
              {tab === 'subscription' && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-medium">Гишүүнчлэл</h2>

                  {/* Current plan */}
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-900/10 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Crown className="w-5 h-5 text-emerald-400" />
                        <div>
                          <p className="text-sm text-white/60">Одоогийн план</p>
                          <p className="font-medium text-white text-lg">
                            {TIER_LABEL_MN[tier] || tier}
                          </p>
                        </div>
                      </div>
                      {hasActivePlan && (
                        <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30">
                          Идэвхтэй
                        </div>
                      )}
                    </div>

                    {hasActivePlan && expiresAt && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-white/50">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Дуусах огноо: <span className="text-white/80">
                            {new Date(expiresAt).toLocaleDateString('mn-MN', {
                              year: 'numeric', month: 'long', day: 'numeric'
                            })}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* No cancel policy */}
                  {hasActivePlan && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-900/10 p-4 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-400 mb-1">Цуцлах боломжгүй</p>
                        <p className="text-xs text-white/50">
                          Авсан гишүүнчлэлийг хугацаа дуустал цуцлах боломжгүй. Хугацаа дууссаны дараа автоматаар сунгагдахгүй.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Upgrade options */}
                  {!hasActivePlan && plans.length > 0 && (
                    <div>
                      <p className="text-sm text-white/60 mb-4">Гишүүнчлэл авах:</p>
                      <div className="grid gap-3">
                        {plans.map((plan) => (
                          <Link
                            key={plan.id}
                            href={`/pricing/${plan.id}`}
                            className="flex items-center justify-between p-4 rounded-xl border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-900/10 transition-all group"
                          >
                            <div>
                              <p className="font-medium text-white">{plan.name_mn}</p>
                              <p className="text-xs text-white/40 capitalize">{plan.billing_period === 'monthly' ? 'Сарын' : 'Жилийн'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-emerald-400">
                                {plan.price_mnt.toLocaleString()}₮
                              </p>
                              <p className="text-xs text-emerald-400/60 group-hover:text-emerald-400 transition-colors">Авах →</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PAYMENTS TAB */}
              {tab === 'payments' && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-medium">Төлбөрийн түүх</h2>

                  {payments.length === 0 ? (
                    <div className="text-center py-12">
                      <CreditCard className="w-12 h-12 text-white/20 mx-auto mb-3" />
                      <p className="text-white/40">Төлбөрийн түүх байхгүй байна</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              payment.status === 'paid' ? 'bg-emerald-400' :
                              payment.status === 'pending' ? 'bg-amber-400' :
                              payment.status === 'failed' ? 'bg-red-400' : 'bg-white/30'
                            }`} />
                            <div>
                              <p className="text-sm font-medium text-white">
                                {payment.subscription_plans?.name_mn || 'Төлбөр'}
                              </p>
                              <p className="text-xs text-white/40">
                                {new Date(payment.created_at).toLocaleDateString('mn-MN', {
                                  year: 'numeric', month: 'short', day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-white">
                              {payment.amount_mnt.toLocaleString()}₮
                            </p>
                            <p className={`text-xs ${
                              payment.status === 'paid' ? 'text-emerald-400' :
                              payment.status === 'pending' ? 'text-amber-400' :
                              payment.status === 'failed' ? 'text-red-400' : 'text-white/40'
                            }`}>
                              {payment.status === 'paid' ? 'Төлсөн' :
                               payment.status === 'pending' ? 'Хүлээгдэж байна' :
                               payment.status === 'failed' ? 'Амжилтгүй' :
                               payment.status === 'refunded' ? 'Буцаагдсан' : payment.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
