import { NextResponse } from 'next/server';

/** GET /api/payment-qr
 *
 * Serves the PromptPay / Thai QR Payment image.
 * Priority:
 *  1. PAYMENT_QR_STATIC_URL env var → redirect 302 to that URL
 *  2. PROMPTPAY_ID env var → generate QR dynamically
 *  3. Fall back to /qr-payment.png static file  
 */
export async function GET(request: Request) {
  // 1. Static URL redirect (fastest, most reliable)
  const staticUrl = process.env.PAYMENT_QR_STATIC_URL;
  if (staticUrl) {
    return NextResponse.redirect(staticUrl, { status: 302 });
  }

  const promptpayId = process.env.PROMPTPAY_ID;
  if (!promptpayId) {
    // Fall back to the static file in public/
    return NextResponse.redirect(new URL('/qr-payment.png', request.url), { status: 302 });
  }

  const { searchParams } = new URL(request.url);
  const size = Math.min(Math.max(parseInt(searchParams.get('size') ?? '400', 10), 100), 800);

  const generatePayload = (await import('promptpay-qr')).default;
  const QRCode = await import('qrcode');

  const payload = generatePayload(promptpayId, {});
  const png = await QRCode.toBuffer(payload, {
    width: size,
    margin: 2,
    color: { dark: '#000000ff', light: '#ffffffff' },
  });

  return new NextResponse(png as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
