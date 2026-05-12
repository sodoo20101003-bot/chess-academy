import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createInvoice } from '@/lib/qpay/client';
import { z } from 'zod';

// Frontend нь camelCase-ээр илгээдэг — гэхдээ snake_case-ийг бас хүлээж авна
const bodySchema = z.object({
  planId: z.string().optional(),
  plan_id: z.string().optional(),
}).refine((d) => d.planId || d.plan_id, {
  message: 'planId or plan_id required',
});

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Нэвтрэх шаардлагатай' }, { status: 401 });
    }

    // 2. Validate body
    const body = await req.json();
    const parsed = bodySchema.parse(body);
    const planId = parsed.planId ?? parsed.plan_id!;

    // 3. Get plan from DB
    const { data: plan, error: planErr } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planErr || !plan) {
      return NextResponse.json({ error: 'Plan олдсонгүй' }, { status: 404 });
    }

    // 4. Create payment record
    const service = createServiceClient();
    const { data: payment, error: paymentErr } = await service
      .from('payments')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        amount_mnt: plan.price_mnt,
        status: 'pending',
      })
      .select()
      .single();

    if (paymentErr || !payment) {
      throw new Error(`Payment record үүсгэж чадсангүй: ${paymentErr?.message}`);
    }

    // 5. Mock mode-д QPAY_INVOICE_CODE байхгүй байж болно
    const invoiceCode = process.env.QPAY_INVOICE_CODE || 'MOCK_INVOICE_CODE';

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/qpay/callback?payment_id=${payment.id}`;
    const invoice = await createInvoice({
      invoice_code: invoiceCode,
      sender_invoice_no: payment.id,
      invoice_receiver_code: user.email!,
      invoice_description: `${plan.name_mn} — GrandMaster.mn`,
      amount: plan.price_mnt,
      callback_url: callbackUrl,
    });

    // 6. Update payment with QPay info
    await service
      .from('payments')
      .update({
        qpay_invoice_id: invoice.invoice_id,
        qpay_qr_text: invoice.qr_text,
        qpay_qr_image: invoice.qr_image,
      })
      .eq('id', payment.id);

    // CheckoutFlow.tsx-ийн хүсэж буй camelCase response (+ snake_case дублицируем)
    return NextResponse.json({
      paymentId: payment.id,
      qpayInvoiceId: invoice.invoice_id,
      qrText: invoice.qr_text,
      qrImage: invoice.qr_image,
      bankUrls: invoice.urls ?? [],
      amount: plan.price_mnt,
      payment_id: payment.id,
      invoice_id: invoice.invoice_id,
      qr_text: invoice.qr_text,
      qr_image: invoice.qr_image,
      bank_urls: invoice.urls ?? [],
    });
  } catch (err) {
    console.error('[QPay Invoice Error]', err);
    const message = err instanceof Error ? err.message : 'Тодорхойгүй алдаа';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
