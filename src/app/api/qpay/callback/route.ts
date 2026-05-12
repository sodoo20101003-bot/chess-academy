import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkInvoice } from '@/lib/qpay/client';

/**
 * QPay-аас төлбөр төлөгдсөний дараа дуудах webhook.
 *
 * URL pattern: /api/qpay/callback?payment_id={uuid}
 *
 * SECURITY: QPay ашиглан төлбөрийг verify хийнэ — webhook body-д
 * найдахгүй (spoofing-ээс хамгаална).
 */
export async function POST(req: Request) {
  return handleCallback(req);
}

export async function GET(req: Request) {
  return handleCallback(req);
}

async function handleCallback(req: Request) {
  try {
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('payment_id');

    if (!paymentId) {
      return NextResponse.json({ error: 'payment_id байхгүй' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Get payment
    const { data: payment } = await supabase
      .from('payments')
      .select('*, subscription_plans(*)')
      .eq('id', paymentId)
      .single();

    if (!payment || !payment.qpay_invoice_id) {
      return NextResponse.json({ error: 'Payment олдсонгүй' }, { status: 404 });
    }

    // 2. ⚠️ ВАЖНО: QPay-аас бодит төлөгдсөн эсэхийг шалга
    const check = await checkInvoice(payment.qpay_invoice_id);
    const paid = check.rows.find((r) => r.payment_status === 'PAID');

    if (!paid) {
      return NextResponse.json({ status: 'not_paid' });
    }

    if (Number(paid.payment_amount) < payment.amount_mnt) {
      return NextResponse.json({ error: 'Дутуу төлсөн' }, { status: 400 });
    }

    // 3. Update payment
    if (payment.status !== 'paid') {
      await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          qpay_payment_id: paid.payment_id,
        })
        .eq('id', payment.id);

      // 4. Update user subscription
      const plan = payment.subscription_plans as { tier: string; billing_period: string };
      const expiresAt = new Date();
      if (plan.billing_period === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      await supabase
        .from('profiles')
        .update({
          subscription_tier: plan.tier,
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq('id', payment.user_id);

      // 5. First purchase achievement
      await supabase
        .from('user_achievements')
        .upsert({ user_id: payment.user_id, achievement_id: 'first_purchase' });
    }

    return NextResponse.json({ status: 'paid' });
  } catch (err) {
    console.error('[QPay Callback Error]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
