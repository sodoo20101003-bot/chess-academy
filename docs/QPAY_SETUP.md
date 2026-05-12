# QPay Integration Guide

QPay-ийн merchant API-тай интеграц хийсэн дэлгэрэнгүй тайлбар.

---

## Архитектур

```
User → /pricing/[planId] → CheckoutFlow component
                              ↓
                          POST /api/qpay/invoice
                              ↓
                          QPay API (merchant.qpay.mn)
                              ↓
                          QR код буцаана
                              ↓
                          User банкны аппаар уншуулна
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
         QPay → POST /api/qpay/callback   Frontend → GET /api/qpay/status (polling)
                    ↓                   ↓
              QPay-аар дахин шалгана (security)
                    ↓
              Profile.subscription_tier шинэчилнэ
```

---

## Authentication flow

QPay нь хоёр шаттай auth ашигладаг:

**1. Token авах** (`POST /auth/token`)
- Basic auth: `Authorization: Basic base64(username:password)`
- Буцаана: `access_token` + `expires_in`
- Token cache хийгдэж дуусахаас 60s өмнө дахин авна

**2. Bearer token-р дуудах**
- `Authorization: Bearer ${access_token}`

`src/lib/qpay/client.ts` нь энэ flow-г бүгдийг handle хийдэг.

---

## Invoice үүсгэх

```ts
const invoice = await qpayClient.createInvoice({
  invoice_code: process.env.QPAY_INVOICE_CODE!,
  sender_invoice_no: paymentId,        // Манай payments.id
  invoice_receiver_code: userId,
  invoice_description: 'Pro гишүүнчлэл — 1 сар',
  amount: 59000,
  callback_url: `${APP_URL}/api/qpay/callback?payment_id=${paymentId}`,
})
```

Буцаана:
```json
{
  "invoice_id": "qpay-uuid",
  "qr_text": "0002...",
  "qr_image": "base64-png",
  "urls": [
    { "name": "khan", "description": "Хаан банк", "link": "khanbank://..." },
    { "name": "tdb", "description": "Худалдаа Хөгжлийн банк", "link": "tdbbank://..." }
  ]
}
```

`qr_image` нь base64-encoded PNG. Frontend дээр `<img src="data:image/png;base64,${qrImage}">` гэж үзүүлнэ.

---

## Webhook security

**Маш чухал**: QPay webhook-ийн body-г шууд итгэж болохгүй. Хорлонтой хүн "paid" гэсэн POST request явуулж болно.

Тиймээс webhook ирэхэд:

1. `payment_id` query parameter авна
2. QPay API-аар **дахин** шалгана: `qpayClient.checkInvoice(qpayInvoiceId)`
3. Хариу нь `PAID` гэсэн үед л database шинэчилнэ

`src/app/api/qpay/callback/route.ts` дотор хэрэгжсэн.

---

## Polling fallback

Хэрэв webhook ажиллахгүй (network асуудал, callback URL alag) тохиолдолд frontend-ийн polling нь backup болно:

```ts
// CheckoutFlow.tsx
setInterval(async () => {
  const res = await fetch(`/api/qpay/status?paymentId=${paymentId}`)
  const data = await res.json()
  if (data.status === 'paid') { /* success */ }
}, 3000)
```

`/api/qpay/status` нь webhook-той ижил verification flow ашигладаг.

---

## Error handling

QPay API-аас гарч болох алдаанууд:

| Алдаа | Шалтгаан | Шийдэл |
|-------|----------|--------|
| `INVALID_CREDENTIALS` | Username/password буруу | `.env`-ийг шалгах |
| `INVOICE_CODE_NOT_FOUND` | Invoice code QPay-д бүртгэлгүй | QPay support-той холбогдох |
| `AMOUNT_TOO_LOW` | 100₮-аас бага | Plan price ширэх |
| `EXPIRED_TOKEN` | Token хугацаа дууссан | Auto-refresh ажиллана |
| `RATE_LIMIT` | Хэт олон request | Exponential backoff |

`src/lib/qpay/client.ts` дотор `QPayError` class-р бүх алдааг handle хийдэг.

---

## Testing locally

QPay sandbox ашиглах:

```bash
# .env.local
QPAY_BASE_URL=https://merchant-sandbox.qpay.mn/v2
QPAY_USERNAME=sandbox_user
QPAY_PASSWORD=sandbox_password
QPAY_INVOICE_CODE=SANDBOX_INVOICE
```

Webhook-ийг local-аас тестлэх:

```bash
# ngrok суулгасан байх
ngrok http 3000

# QPay-д nogrok URL-ыг callback болгож бүртгэх:
# https://abcd.ngrok.io/api/qpay/callback?payment_id=...
```

---

## Subscription extension logic

`/api/qpay/callback` дотор төлбөр амжилттай болоход:

```ts
const tier = plan.tier
const periodMs = plan.billing_period === 'yearly'
  ? 365 * 24 * 60 * 60 * 1000
  : 30 * 24 * 60 * 60 * 1000

// Хэрэв одоогийн subscription байгаа бол үргэлжлүүлж нэмнэ
const currentExpiry = profile.subscription_expires_at
  ? new Date(profile.subscription_expires_at)
  : new Date()

const newExpiry = currentExpiry > new Date()
  ? new Date(currentExpiry.getTime() + periodMs)
  : new Date(Date.now() + periodMs)

await supabase.from('profiles').update({
  subscription_tier: tier,
  subscription_expires_at: newExpiry.toISOString(),
}).eq('id', userId)
```

Энэ нь идэвхтэй гишүүнчлэл дээр нэмэлт төлсөн тохиолдолд хугацаа сунгахад хэрэгтэй.

---

## Production considerations

1. **Idempotency**: Нэг callback хоёр удаа ирвэл хоёр удаа process хийж болохгүй. `payments.status === 'paid'` шалгах.

2. **Rate limiting**: `/api/qpay/invoice` дээр user-н нэг минутад 5 request гэх мэт хязгаар тавих (Vercel Edge Config + KV ашиглаж болно).

3. **Audit log**: Бүх payment event-ийг log хийх. `payments.metadata` jsonb талбарт QPay response хадгалагдана.

4. **Refund**: QPay-д API-р refund хийх боломжтой. Тусдаа admin endpoint бичих хэрэгтэй.

5. **Currency**: Зөвхөн MNT дэмжинэ. Олон улсын төлбөрийн хувьд Stripe-тай parallel integration нэмэх боломжтой.

---

## Resources

- [QPay merchant docs](https://developer.qpay.mn) (Mongolian)
- [Source: src/lib/qpay/client.ts](../src/lib/qpay/client.ts)
- [Webhook handler: src/app/api/qpay/callback/route.ts](../src/app/api/qpay/callback/route.ts)
