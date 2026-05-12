'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle, Smartphone, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatMNT } from '@/lib/utils'
import { toast } from 'sonner'

interface Plan {
  id: string
  tier: string
  name_mn: string
  price_mnt: number
  billing_period: string
}

interface InvoiceResponse {
  paymentId: string
  qpayInvoiceId: string
  qrText: string
  qrImage: string
  bankUrls: { name: string; description: string; logo: string; link: string }[]
}

type Status = 'idle' | 'creating' | 'pending' | 'paid' | 'failed'

export function CheckoutFlow({ plan, userEmail }: { plan: Plan; userEmail: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('idle')
  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createInvoice = useCallback(async () => {
    setStatus('creating')
    setError(null)
    try {
      const res = await fetch('/api/qpay/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Нэхэмжлэх үүсгэхэд алдаа гарлаа')
      }
      const data: InvoiceResponse = await res.json()
      setInvoice(data)
      setStatus('pending')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Алдаа гарлаа')
      setStatus('failed')
    }
  }, [plan.id])

  // Poll for payment status
  useEffect(() => {
    if (status !== 'pending' || !invoice) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/qpay/status?paymentId=${invoice.paymentId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.status === 'paid') {
          setStatus('paid')
          toast.success('Төлбөр амжилттай хийгдлээ!')
          setTimeout(() => router.push('/dashboard'), 2000)
        } else if (data.status === 'failed' || data.status === 'expired') {
          setStatus('failed')
          setError('Төлбөр амжилтгүй боллоо')
        }
      } catch {
        // ignore polling errors
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [status, invoice, router])

  const copyAmount = () => {
    navigator.clipboard.writeText(String(plan.price_mnt))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-4xl text-white mb-2">Төлбөр төлөх</h1>
        <p className="text-white/60">Та <span className="text-emerald-400">{plan.name_mn}</span> сонгосон.</p>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Захиалгын дэлгэрэнгүй</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/50">Гишүүнчлэл</dt>
              <dd className="text-white">{plan.name_mn}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/50">Хугацаа</dt>
              <dd className="text-white">{plan.billing_period === 'monthly' ? '1 сар' : '1 жил'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/50">И-мэйл</dt>
              <dd className="text-white text-xs">{userEmail}</dd>
            </div>
            <div className="border-t border-white/10 pt-3 flex justify-between items-baseline">
              <dt className="text-white/70 font-medium">Нийт төлөх дүн</dt>
              <dd className="font-display text-3xl text-emerald-400">
                {formatMNT(plan.price_mnt)} ₮
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button onClick={createInvoice} size="xl" className="w-full">
              QPay-р төлөх
            </Button>
            <p className="text-xs text-white/40 text-center mt-4">
              Та QPay-г дэмждэг бүх банкны аппаар төлбөрөө хийх боломжтой.
            </p>
          </motion.div>
        )}

        {status === 'creating' && (
          <motion.div
            key="creating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
            <p className="text-white/70">Нэхэмжлэх үүсгэж байна...</p>
          </motion.div>
        )}

        {status === 'pending' && invoice && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card>
              <CardContent className="text-center">
                <div className="inline-block bg-white p-4 rounded-2xl mb-6">
                  <Image
                    src={`data:image/png;base64,${invoice.qrImage}`}
                    alt="QPay QR код"
                    width={240}
                    height={240}
                    className="block"
                    unoptimized
                  />
                </div>

                <h3 className="font-display text-2xl text-white mb-2">QR кодыг уншуулна уу</h3>
                <p className="text-sm text-white/60 mb-6">
                  Банкны аппаа нээж QR код уншуулаад<br />
                  төлбөрөө баталгаажуулна уу
                </p>

                <button
                  onClick={copyAmount}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/70 mb-6"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {formatMNT(plan.price_mnt)} ₮
                </button>

                <div className="flex items-center gap-2 justify-center text-xs text-emerald-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Төлбөр шалгаж байна...
                </div>
              </CardContent>
            </Card>

            {invoice.bankUrls && invoice.bankUrls.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-white/50 text-center mb-3 flex items-center justify-center gap-2">
                  <Smartphone className="w-3 h-3" />
                  Эсвэл утаснаасаа шууд нээх
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {invoice.bankUrls.slice(0, 8).map((bank) => (
                    <a
                      key={bank.name}
                      href={bank.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl glass border border-white/10 hover:border-emerald-500/40 transition-colors text-center"
                    >
                      <p className="text-xs text-white/80 truncate">{bank.description}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {status === 'paid' && (
          <motion.div
            key="paid"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto mb-6" />
            <h2 className="font-display text-3xl text-white mb-2">Төлбөр амжилттай!</h2>
            <p className="text-white/60 mb-6">Гишүүнчлэл идэвхжлээ. Удахгүй чиглүүлэгдэнэ...</p>
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mx-auto" />
          </motion.div>
        )}

        {status === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="font-display text-2xl text-white mb-2">Алдаа гарлаа</h2>
            <p className="text-white/60 mb-6">{error}</p>
            <Button onClick={createInvoice} variant="outline">
              Дахин оролдох
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
