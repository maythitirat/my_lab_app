/**
 * setup-rich-menu.mjs
 *
 * สร้าง LINE Rich Menu สำหรับ Check-in / Check-out
 *
 * Prerequisites:
 *   export LINE_CHANNEL_ACCESS_TOKEN="<your channel access token>"
 *   export LIFF_CHECKIN_URL="https://liff.line.me/<your check-in liff id>"
 *   export LIFF_ORDER_URL="https://liff.line.me/<your ordering liff id>"   # optional
 *
 * Usage:
 *   node scripts/setup-rich-menu.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const CHECKIN_URL = process.env.LIFF_CHECKIN_URL;
const ORDER_URL = process.env.LIFF_ORDER_URL ?? CHECKIN_URL; // fallback

if (!TOKEN) {
  console.error('❌  LINE_CHANNEL_ACCESS_TOKEN is not set.');
  process.exit(1);
}
if (!CHECKIN_URL) {
  console.error('❌  LIFF_CHECKIN_URL is not set.');
  process.exit(1);
}

// ─── 1. Rich Menu definition ─────────────────────────────────────────────────
// Layout: 2 columns × 1 row  (2500 × 843 px)
//   Left  → Check-in
//   Right → Check-out

const richMenu = {
  size: { width: 2500, height: 843 },
  selected: true,
  name: 'Check-in / Check-out Menu',
  chatBarText: '📋 เช็คอิน / เช็คเอาท์',
  areas: [
    {
      bounds: { x: 0, y: 0, width: 1250, height: 843 },
      action: {
        type: 'uri',
        label: 'Check-in',
        uri: CHECKIN_URL,
      },
    },
    {
      bounds: { x: 1250, y: 0, width: 1250, height: 843 },
      action: {
        type: 'uri',
        label: 'Check-out',
        uri: CHECKIN_URL, // same LIFF page handles both actions
      },
    },
  ],
};

// ─── Helper ──────────────────────────────────────────────────────────────────
async function lineApi(path, method = 'GET', body) {
  const res = await fetch(`https://api.line.me/v2/bot${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`LINE API ${method} ${path} → ${res.status}: ${text}`);
  return json;
}

// ─── 2. Create rich menu ──────────────────────────────────────────────────────
console.log('📤  Creating rich menu…');
const { richMenuId } = await lineApi('/richmenu', 'POST', richMenu);
console.log(`✅  Rich menu created: ${richMenuId}`);

// ─── 3. Upload image ──────────────────────────────────────────────────────────
// Place your 2500×843 PNG at scripts/rich-menu-image.png
// If the file does not exist we skip this step with a warning.
const imagePath = resolve(__dirname, 'rich-menu-image.png');
let imageBuffer;
try {
  imageBuffer = readFileSync(imagePath);
} catch {
  console.warn('⚠️   scripts/rich-menu-image.png not found — skipping image upload.');
  console.warn('    Upload an image manually via LINE Developers Console or call:');
  console.warn(`    POST https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`);
}

if (imageBuffer) {
  console.log('🖼   Uploading rich menu image…');
  const imgRes = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'image/png',
      },
      body: imageBuffer,
    },
  );
  if (!imgRes.ok) {
    const t = await imgRes.text();
    console.error(`❌  Image upload failed: ${t}`);
  } else {
    console.log('✅  Image uploaded.');
  }
}

// ─── 4. Set as default rich menu ─────────────────────────────────────────────
console.log('🔗  Setting as default rich menu…');
await lineApi(`/user/all/richmenu/${richMenuId}`, 'POST');
console.log('✅  Default rich menu set.');

console.log('\n🎉  Done!');
console.log(`   Rich Menu ID : ${richMenuId}`);
console.log(`   Check-in URL : ${CHECKIN_URL}`);
console.log('\nTip: Open scripts/set-user-richmenu.mjs to apply the menu per user instead.');
