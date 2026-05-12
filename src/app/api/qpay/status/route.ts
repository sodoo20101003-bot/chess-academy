import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkInvoice } from '@/lib/qpay/client';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Client polls this endpoint to check payment status.
 * GET /api/qpay/status?payment_id={uuid}
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const paymentId = url.searchParams.get('paymentId') || url.searchParams.get('payment_id');
  if (!paymentId) return NextResponse.json({ error: 'paymentId required' }, { status: 400 });

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .eq('user_id', user.id)
    .single();

  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Already paid → return early
  if (payment.status === 'paid') {
    return NextResponse.json({ status: 'paid' });
  }

  // Expired
  if (new Date(payment.expires_at) < new Date()) {
    return NextResponse.json({ status: 'expired' });
  }

  // Check with QPay
  if (payment.qpay_invoice_id) {
    try {
      const check = await checkInvoice(payment.qpay_invoice_id);
      const paid = check.rows.find((r) => r.payment_status === 'PAID');

      if (paid && Number(paid.payment_amount) >= payment.amount_mnt) {
        // Trigger callback flow
        const service = createServiceClient();
        const { data: planData } = await service
          .from('subscription_plans')
          .select('*')
          .eq('id', payment.plan_id)
          .single();

        if (planData) {
          const expiresAt = new Date();
          if (planData.billing_period === 'yearly') {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          } else {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
          }

          await service
            .from('payments')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              qpay_payment_id: paid.payment_id,
            })
            .eq('id', payment.id);

          await service
            .from('profiles')
            .update({
              subscription_tier: planData.tier,
              subscription_expires_at: expiresAt.toISOString(),
            })
            .eq('id', user.id);
        }

        return NextResponse.json({ status: 'paid' });
      }
    } catch (err) {
      console.error('[QPay status check error]', err);
    }
  }

  return NextResponse.json({ status: 'pending' });
}
