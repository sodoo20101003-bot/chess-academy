/**
 * QPay V2 API wrapper
 *
 * Documentation: https://developer.qpay.mn/
 *
 * Workflow:
 *  1. authenticate() — access_token авах (24 цагт нэг)
 *  2. createInvoice() — invoice үүсгэн QR text + image буцаана
 *  3. checkInvoice() — төлбөр төлөгдсөн эсэхийг шалгана
 *  4. callback webhook — QPay automatic notification илгээнэ
 */

const QPAY_BASE_URL = process.env.QPAY_BASE_URL || 'https://merchant.qpay.mn/v2';

interface QPayToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number; // Бидний нэмсэн timestamp
}

// In-memory token cache (production-д Redis ашиглах нь зөв)
let cachedToken: QPayToken | null = null;

export interface CreateInvoiceParams {
  invoice_code: string;       // Process.env.QPAY_INVOICE_CODE
  sender_invoice_no: string;  // Бидний дотоод payment.id
  invoice_receiver_code: string; // User identifier (email эсвэл user_id)
  invoice_description: string;
  amount: number;             // MNT
  callback_url: string;       // QPay-аас webhook ирэх URL
}

export interface QPayInvoiceResponse {
  invoice_id: string;
  qr_text: string;
  qr_image: string;           // Base64 PNG
  qPay_shortUrl: string;
  urls: Array<{
    name: string;
    description: string;
    logo: string;
    link: string;             // Deep link to bank apps
  }>;
}

export interface QPayPaymentCheck {
  count: number;
  paid_amount: number;
  rows: Array<{
    payment_id: string;
    payment_status: 'NEW' | 'FAILED' | 'PAID' | 'REFUNDED';
    payment_date: string;
    payment_fee: string;
    payment_amount: string;
    payment_currency: string;
  }>;
}

class QPayError extends Error {
  constructor(message: string, public status?: number, public response?: unknown) {
    super(message);
    this.name = 'QPayError';
  }
}

/**
 * QPay-аас access_token авах
 */
async function authenticate(): Promise<QPayToken> {
  // Cache хүчинтэй бол тэр чигээр буцаа
  if (cachedToken && cachedToken.expires_at > Date.now() + 60_000) {
    return cachedToken;
  }

  const username = process.env.QPAY_USERNAME;
  const password = process.env.QPAY_PASSWORD;
  if (!username || !password) {
    throw new QPayError('QPAY_USERNAME эсвэл QPAY_PASSWORD env-д тохируулаагүй байна');
  }

  const credentials = Buffer.from(`${username}:${password}`).toString('base64');

  const res = await fetch(`${QPAY_BASE_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new QPayError(`Auth failed: ${res.status}`, res.status, text);
  }

  const data = await res.json();
  cachedToken = {
    ...data,
    expires_at: Date.now() + (data.expires_in * 1000),
  };
  return cachedToken!;
}

/**
 * QPay invoice үүсгэх
 *
 * DEV MODE: QPay credentials тохируулаагүй үед mock QR буцаана
 * (ингэснээр локал тестлэх боломжтой)
 */
export async function createInvoice(params: CreateInvoiceParams): Promise<QPayInvoiceResponse> {
  // ===== DEV / MOCK MODE =====
  const hasCreds = process.env.QPAY_USERNAME && process.env.QPAY_PASSWORD;
  const isDevMode = !hasCreds || process.env.QPAY_MOCK === 'true';

  if (isDevMode) {
    console.warn('[QPay] DEV MOCK MODE — QPay credentials байхгүй учир fake invoice буцаана. Production-д QPAY_USERNAME, QPAY_PASSWORD, QPAY_INVOICE_CODE-ыг тохируулна уу.');
    // 1x1 transparent png base64
    const mockQrImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    return {
      invoice_id: `mock-${params.sender_invoice_no}`,
      qr_text: `qpay-mock://invoice/${params.sender_invoice_no}?amount=${params.amount}`,
      qr_image: mockQrImage,
      qPay_shortUrl: `https://qpay.mn/q/mock`,
      urls: [
        { name: 'Khan Bank', description: 'Хаан банк (mock)', logo: '', link: '#' },
        { name: 'Golomt Bank', description: 'Голомт банк (mock)', logo: '', link: '#' },
        { name: 'TDB', description: 'Худалдаа хөгжлийн банк (mock)', logo: '', link: '#' },
      ],
    };
  }

  const token = await authenticate();

  const res = await fetch(`${QPAY_BASE_URL}/invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.access_token}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new QPayError(`Invoice creation failed: ${res.status}`, res.status, text);
  }

  return res.json();
}

/**
 * Төлбөр төлөгдсөн эсэхийг шалгах
 */
export async function checkInvoice(invoiceId: string): Promise<QPayPaymentCheck> {
  const token = await authenticate();

  const res = await fetch(`${QPAY_BASE_URL}/payment/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.access_token}`,
    },
    body: JSON.stringify({
      object_type: 'INVOICE',
      object_id: invoiceId,
      page_number: 1,
      page_limit: 100,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new QPayError(`Payment check failed: ${res.status}`, res.status, text);
  }

  return res.json();
}

/**
 * Invoice цуцлах
 */
export async function cancelInvoice(invoiceId: string): Promise<void> {
  const token = await authenticate();

  await fetch(`${QPAY_BASE_URL}/invoice/${invoiceId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
}

export { QPayError };
