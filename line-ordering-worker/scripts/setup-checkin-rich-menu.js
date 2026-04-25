/**
 * Setup LINE Rich Menu for Check-in / Check-out.
 *
 * Layout (2 panels, 2500x843):
 *  ┌──────────────────┬──────────────────┐
 *  │  🟢 เช็คอิน      │  🔴 เช็คเอาท์    │
 *  │   Check-in       │   Check-out      │
 *  └──────────────────┴──────────────────┘
 *
 * Both panels open the same LIFF page (/check-in).
 * The user then presses the green or red button inside the UI.
 *
 * Run:
 *   python3 scripts/gen-checkin-rich-menu.py && node scripts/setup-checkin-rich-menu.js
 *
 * Required env vars in .env:
 *   LINE_CHANNEL_ACCESS_TOKEN
 *   LIFF_CHECKIN_ID   — LIFF ID for the /check-in page
 *
 * Optional:
 *   LINE_ADMIN_USER_ID  — if set, menu is applied only to this user (admin test)
 *                         omit to set as default for ALL users
 */
const fs   = require('fs');
const zlib = require('zlib');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ACCESS_TOKEN    = process.env.LINE_CHANNEL_ACCESS_TOKEN;
// Use dedicated LIFF_CHECKIN_ID if available, otherwise reuse LIFF_ID with /check-in path
const LIFF_CHECKIN_ID = process.env.LIFF_CHECKIN_ID || process.env.LIFF_ID;
const TARGET_USER_ID  = process.env.LINE_CHECKIN_MENU_USER_ID ?? ''; // optional per-user

if (!ACCESS_TOKEN) {
  console.error('❌  LINE_CHANNEL_ACCESS_TOKEN is not set in .env');
  process.exit(1);
}
if (!LIFF_CHECKIN_ID) {
  console.error('❌  LIFF_CHECKIN_ID (or LIFF_ID) is not set in .env');
  process.exit(1);
}

// If using LIFF_CHECKIN_ID → root LIFF URL, if reusing LIFF_ID → append /check-in path
const LIFF_CHECKIN_URL = process.env.LIFF_CHECKIN_ID
  ? `https://liff.line.me/${LIFF_CHECKIN_ID}`
  : `https://liff.line.me/${LIFF_CHECKIN_ID}/check-in`;
const MENU_IMAGE = path.join(__dirname, 'checkin-rich-menu.png');

// ── Fallback PNG (2-panel: green | red) ──────────────────────────────────────
function createFallbackPNG(width, height) {
  const half = Math.floor(width / 2);
  const colors = [
    [6, 199, 85],    // LINE green
    [220, 53, 47],   // red
  ];
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const off = y * rowSize;
    raw[off] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = x < half ? colors[0] : colors[1];
      raw[off + 1 + x * 3]     = r;
      raw[off + 1 + x * 3 + 1] = g;
      raw[off + 1 + x * 3 + 2] = b;
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) {
      c ^= byte;
      for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  const mkChunk = (type, data) => {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crcBuf]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from('\x89PNG\r\n\x1a\n', 'binary'),
    mkChunk('IHDR', ihdr),
    mkChunk('IDAT', compressed),
    mkChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── LINE API helpers ──────────────────────────────────────────────────────────
async function linePost(p, body) {
  const res = await fetch(`https://api.line.me/v2/bot${p}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`LINE API POST ${p} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function lineGet(p) {
  const res = await fetch(`https://api.line.me/v2/bot${p}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function lineDelete(p) {
  await fetch(`https://api.line.me/v2/bot${p}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
}

async function uploadImage(richMenuId, imageBuffer) {
  const res = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'image/png' },
      body: imageBuffer,
    },
  );
  if (!res.ok) throw new Error(`Image upload ${res.status}: ${await res.text()}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 Setting up Check-in / Check-out Rich Menu…');
  console.log(`   LIFF URL : ${LIFF_CHECKIN_URL}`);

  // 1. Delete old check-in rich menus (those named 'Check-in Menu')
  console.log('🗑  Cleaning up old check-in rich menus…');
  const list = await lineGet('/richmenu/list');
  if (list?.richmenus) {
    for (const m of list.richmenus) {
      if (m.name === 'Check-in / Check-out Menu') {
        await lineDelete(`/richmenu/${m.richMenuId}`);
        console.log(`   Deleted: ${m.richMenuId}`);
      }
    }
  }

  // 2. Create rich menu structure
  const { richMenuId } = await linePost('/richmenu', {
    size: { width: 2500, height: 843 },
    selected: true,
    name: 'Check-in / Check-out Menu',
    chatBarText: '📋 เช็คอิน',
    areas: [
      // Left — Check-in (opens LIFF, user taps green button)
      {
        bounds: { x: 0, y: 0, width: 1250, height: 843 },
        action: { type: 'uri', label: 'เช็คอิน', uri: LIFF_CHECKIN_URL },
      },
      // Right — Check-out (same LIFF page, user taps red button)
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 843 },
        action: { type: 'uri', label: 'เช็คเอาท์', uri: LIFF_CHECKIN_URL },
      },
    ],
  });
  console.log(`✅ Rich menu created: ${richMenuId}`);

  // 3. Upload image
  let imageBuffer;
  if (fs.existsSync(MENU_IMAGE)) {
    console.log(`🖼  Using: ${MENU_IMAGE}`);
    imageBuffer = fs.readFileSync(MENU_IMAGE);
  } else {
    console.warn('⚠️   checkin-rich-menu.png not found — using flat-colour fallback.');
    console.warn('    Run: python3 scripts/gen-checkin-rich-menu.py  to generate a real image.');
    imageBuffer = createFallbackPNG(2500, 843);
  }
  await uploadImage(richMenuId, imageBuffer);
  console.log('✅ Image uploaded');

  // 4. Activate — per-user OR default for all
  if (TARGET_USER_ID) {
    // Remove any existing rich menu for this specific user first
    await lineDelete(`/user/${TARGET_USER_ID}/richmenu`);
    const res = await fetch(
      `https://api.line.me/v2/bot/user/${TARGET_USER_ID}/richmenu/${richMenuId}`,
      { method: 'POST', headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
    );
    if (!res.ok) throw new Error(`Per-user link failed ${res.status}: ${await res.text()}`);
    console.log(`✅ Rich menu linked to user: ${TARGET_USER_ID}`);
  } else {
    const res = await fetch(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      { method: 'POST', headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
    );
    if (!res.ok) throw new Error(`Set default failed ${res.status}: ${await res.text()}`);
    console.log('✅ Rich menu set as DEFAULT for all users');
  }

  console.log('\n🎉 Done!');
  console.log(`   Rich Menu ID : ${richMenuId}`);
  console.log(`   LIFF URL     : ${LIFF_CHECKIN_URL}`);
  console.log('\nTip: To update later, just run this script again — it auto-deletes the old menu.');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
