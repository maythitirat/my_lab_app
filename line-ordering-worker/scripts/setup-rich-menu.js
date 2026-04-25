/**
 * One-time script to create and activate a LINE Rich Menu.
 *
 * Run (generates a designed image first, then uploads):
 *   python3 scripts/gen-rich-menu.py && node scripts/setup-rich-menu.js
 *
 * Or just re-upload the menu structure without regenerating the image:
 *   node scripts/setup-rich-menu.js
 */
const fs   = require('fs');
const zlib = require('zlib');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LIFF_ID = process.env.LIFF_ID || '2009692421-qzL3USNe';
const LIFF_URL = `https://liff.line.me/${LIFF_ID}`;

if (!ACCESS_TOKEN) {
  console.error('LINE_CHANNEL_ACCESS_TOKEN is not set in .env');
  process.exit(1);
}

// ── Image loading ────────────────────────────────────────────────────────────
// Use the designed PNG from gen-rich-menu.py if present; fallback to flat color
const RICH_MENU_IMAGE = path.join(__dirname, 'rich-menu.png');

function getRichMenuImageBuffer() {
  if (fs.existsSync(RICH_MENU_IMAGE)) {
    console.log(`🖼  Using designed image: ${RICH_MENU_IMAGE}`);
    return fs.readFileSync(RICH_MENU_IMAGE);
  }
  console.log('🖼  No rich-menu.png found — generating flat-color placeholder');
  return createFallbackPNG(2500, 843);
}

// ── Fallback PNG generator (flat 3-color split) ───────────────────────────────
function createFallbackPNG(width, height) {
  const third = Math.floor(width / 3);
  // left: teal #27ACB2, middle: blue #1565C0, right: red #E53935
  const colors = [
    [0x27, 0xac, 0xb2],
    [0x15, 0x65, 0xc0],
    [0xe5, 0x39, 0x35],
  ];
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const off = y * rowSize;
    raw[off] = 0;
    for (let x = 0; x < width; x++) {
      const seg = x < third ? 0 : x < third * 2 ? 1 : 2;
      const [r, g, b] = colors[seg];
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

// ── LINE API helpers ─────────────────────────────────────────────────────────
async function lineApi(path, body) {
  const res = await fetch(`https://api.line.me/v2/bot${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`LINE API ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function uploadRichMenuImage(richMenuId, png) {
  const res = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'image/png',
      },
      body: png,
    },
  );
  if (!res.ok) throw new Error(`Image upload ${res.status}: ${await res.text()}`);
}

async function main() {
  console.log('🛒 Setting up LINE Rich Menu...');
  console.log(`   LIFF URL: ${LIFF_URL}`);

  // 1. Remove existing default rich menu (ignore errors)
  await fetch('https://api.line.me/v2/bot/user/all/richmenu', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  }).catch(() => {});

  // 2. Create rich menu structure
  const EDIT_LIFF_URL = `https://liff.line.me/${LIFF_ID}/edit-order`;
  const CANCEL_LIFF_URL = `https://liff.line.me/${LIFF_ID}/cancel-order`;
  const { richMenuId } = await lineApi('/richmenu', {
    size: { width: 2500, height: 843 },
    selected: true,
    name: 'Main Menu',
    chatBarText: '🍱 เมนู',
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: 'uri', label: 'สั่งสินค้า', uri: LIFF_URL },
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: 'uri', label: 'แก้ไขออเดอร์', uri: EDIT_LIFF_URL },
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: 'uri', label: 'ยกเลิกออเดอร์', uri: CANCEL_LIFF_URL },
      },
    ],
  });
  console.log(`✅ Rich menu created: ${richMenuId}`);

  // 3. Upload image
  const png = getRichMenuImageBuffer();
  await uploadRichMenuImage(richMenuId, png);
  console.log('✅ Image uploaded');

  // 4. Set as default for all users
  const setRes = await fetch(
    `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
    { method: 'POST', headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
  );
  if (!setRes.ok) throw new Error(`Set default failed: ${await setRes.text()}`);
  console.log('✅ Rich menu set as default for all users');

  console.log('\n🎉 Done! Open LINE and you should see the rich menu.');
  console.log(`   Rich Menu ID: ${richMenuId}`);
  console.log('\n💡 Replace the image by uploading your own 2500x843 PNG/JPG:');
  console.log(`   curl -X POST https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content \\`);
  console.log(`     -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \\`);
  console.log(`     -H "Content-Type: image/png" --data-binary @your-image.png`);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
