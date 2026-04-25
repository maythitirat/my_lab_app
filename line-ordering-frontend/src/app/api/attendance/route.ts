import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/attendance
 *
 * Body: { lineUserId: string, type: 'IN' | 'OUT', note?: string }
 *
 * Stores the check-in/check-out record in Supabase `attendance` table.
 * Table DDL (run once in Supabase SQL editor):
 *
 *   create table attendance (
 *     id           bigserial primary key,
 *     line_user_id text        not null,
 *     type         text        not null check (type in ('IN','OUT')),
 *     note         text,
 *     created_at   timestamptz not null default now()
 *   );
 *
 * Required env vars (server-side):
 *   SUPABASE_URL              – https://[project-id].supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY – from Supabase Dashboard > Settings > API
 *
 * Optional env vars:
 *   WORKER_URL    – LINE worker URL (for push notification to admin)
 *   WORKER_SECRET – shared secret for worker auth
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { message: 'Database not configured. Please contact admin.' },
      { status: 503 },
    );
  }

  let body: { lineUserId?: unknown; type?: unknown; note?: unknown; locationType?: unknown; lat?: unknown; lng?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const { lineUserId, type, note, locationType, lat, lng } = body;

  if (typeof lineUserId !== 'string' || !lineUserId.trim()) {
    return NextResponse.json({ message: 'lineUserId is required' }, { status: 400 });
  }
  if (type !== 'IN' && type !== 'OUT') {
    return NextResponse.json({ message: 'type must be IN or OUT' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('attendance')
    .insert({
      line_user_id: lineUserId.trim(),
      type,
      note: typeof note === 'string' && note.trim() ? note.trim() : null,
      location_type: locationType === 'onSite' || locationType === 'online' ? locationType : null,
      lat: typeof lat === 'number' ? lat : null,
      lng: typeof lng === 'number' ? lng : null,
    })
    .select()
    .single();

  if (error) {
    console.error('[attendance] Supabase error:', error);
    return NextResponse.json({ message: `Database error: ${error.message}` }, { status: 500 });
  }

  // Optional: push notification to admin via LINE worker
  const workerUrl = process.env.WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (workerUrl && workerSecret) {
    try {
      await fetch(`${workerUrl}/notify/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-secret': workerSecret,
        },
        body: JSON.stringify({ lineUserId, type, note, timestamp: data.created_at }),
      });
    } catch {
      // Non-critical — record is saved, notification failure is not a blocker
    }
  }

  const label = type === 'IN' ? 'Check-in' : 'Check-out';
  const locationLabel = data.location_type === 'onSite' ? 'OnSite' : data.location_type === 'online' ? 'Online' : null;
  const message = locationLabel ? `${label} ${locationLabel} สำเร็จ!` : `${label} สำเร็จ!`;
  return NextResponse.json(
    { message, id: data.id, createdAt: data.created_at, locationType: data.location_type },
    { status: 201 },
  );
}

/** GET /api/attendance?lineUserId=xxx  — ดึงประวัติของ user คนนั้น */
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ message: 'Database not configured.' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const lineUserId = searchParams.get('lineUserId');

  if (!lineUserId) {
    return NextResponse.json({ message: 'lineUserId is required' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('attendance')
    .select('id, type, note, created_at')
    .eq('line_user_id', lineUserId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
