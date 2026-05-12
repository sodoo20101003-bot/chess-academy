import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { formatMNT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  paid: { label: 'Төлсөн', tone: 'bg-emerald-500/15 text-emerald-300' },
  pending: { label: 'Хүлээгдэж буй', tone: 'bg-gold-500/15 text-gold-300' },
  failed: { label: 'Амжилтгүй', tone: 'bg-red-500/15 text-red-300' },
  refunded: { label: 'Буцаасан', tone: 'bg-white/10 text-white/60' },
};

/**
 * /admin/payments — QPay invoice ба орлогын жагсаалт
 */
export default async function AdminPaymentsPage() {
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id, amount_mnt, status, created_at, paid_at, qpay_invoice_id,
      user_id,
      plan_tier,
      profiles!payments_user_id_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  const paidTotal = ((payments ?? []) as any[])
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount_mnt ?? 0), 0);

  const pendingCount = ((payments ?? []) as any[]).filter((p) => p.status === 'pending').length;

  return (
    <div className="container mx-auto px-6 py-12 max-w-6xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Admin Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl font-medium">Төлбөрүүд</h1>
        <p className="text-white/50 mt-2">QPay invoice, орлогын хяналт</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <div className="glass rounded-2xl p-5">
          <div className="text-2xl font-display font-medium tabular-nums text-emerald-400">
            {formatMNT(paidTotal)}
          </div>
          <div className="text-xs uppercase tracking-wider text-white/40 mt-1">Нийт орлого</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-2xl font-display font-medium tabular-nums text-gold-400">
            {pendingCount}
          </div>
          <div className="text-xs uppercase tracking-wider text-white/40 mt-1">Хүлээгдэж буй</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-2xl font-display font-medium tabular-nums">
            {payments?.length ?? 0}
          </div>
          <div className="text-xs uppercase tracking-wider text-white/40 mt-1">Сүүлийн 200</div>
        </div>
      </div>

      {!payments || payments.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <DollarSign className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">Төлбөр бүртгэгдээгүй байна.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-white/40 font-normal">Сурагч</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-white/40 font-normal">Plan</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-white/40 font-normal">Дүн</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-white/40 font-normal">Статус</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-white/40 font-normal">Огноо</th>
                </tr>
              </thead>
              <tbody>
                {(payments as any[]).map((p) => {
                  const profile = p.profiles;
                  const statusInfo = STATUS_LABELS[p.status] ?? { label: p.status, tone: 'bg-white/10 text-white/70' };
                  return (
                    <tr key={p.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="font-medium">{profile?.full_name || 'Нэргүй'}</div>
                        <div className="text-xs text-white/40">{profile?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-white/70 capitalize">{p.plan_tier ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {formatMNT(p.amount_mnt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusInfo.tone}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs tabular-nums">
                        {new Date(p.paid_at || p.created_at).toLocaleDateString('mn-MN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
