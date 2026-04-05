import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/** POST /api/upload-slip
 *
 * Accepts a multipart/form-data body with:
 *   - file: the slip image (JPEG/PNG/WebP)
 *   - orderId: the order ID string
 *   - customerName: customer's name (for admin notification)
 *
 * Uploads to Supabase Storage, then notifies the LINE worker so the admin
 * receives a LINE message with the slip image.
 *
 * Required env vars (server-side):
 *   SUPABASE_URL            — https://[project-id].supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — from Supabase Dashboard > Settings > API
 *   WORKER_URL              — the LINE worker Lambda URL
 *   WORKER_SECRET           — shared secret for worker authentication
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const workerUrl = process.env.WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Storage not configured. Please contact admin.' },
      { status: 503 },
    );
  }
  if (!workerUrl || !workerSecret) {
    return NextResponse.json(
      { error: 'Notification service not configured.' },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const orderId = formData.get('orderId') as string | null;
  const customerName = (formData.get('customerName') as string | null) ?? 'ลูกค้า';

  if (!file || !orderId) {
    return NextResponse.json({ error: 'Missing file or orderId' }, { status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File size must be under 5 MB' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const ext = file.name.split('.').pop() ?? 'jpg';
  const filePath = `order-${orderId}/${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from('slips')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('slips').getPublicUrl(filePath);
  const slipUrl = urlData.publicUrl;

  // Notify LINE worker → admin gets a LINE message with the slip
  try {
    await fetch(`${workerUrl}/notify/slip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': workerSecret,
      },
      body: JSON.stringify({
        orderId: parseInt(orderId, 10),
        slipUrl,
        customerName,
      }),
    });
  } catch {
    // Non-critical – slip is saved, just notification failed
  }

  return NextResponse.json({ ok: true, slipUrl });
}
