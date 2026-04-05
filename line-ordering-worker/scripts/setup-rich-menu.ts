/**
 * One-time script to create and activate a LINE Rich Menu.
 * Run: npm run setup:rich-menu
 *
 * Rich menu layout (compact 2500x843):
 * ┌─────────────────────────┐
 * │   🛒 สั่งอาหาร (full)   │  → opens LIFF
 * └─────────────────────────┘
 */
import * as zlib from 'zlib';
import * as dotenv from 'dotenv';
dotenv.config();

const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const LIFF_ID = process.env.LIFF_ID || '2009692421-qzL3USNe';
const LIFF_URL = `https://liff.line.me/${LIFF_ID}`;

if (!ACCESS_TOKEN) {
  console.error('LINE_CHANNEL_ACCESS_TOKEN is not set');
  process.exit(1);
}

// ── Minimal inline PNG generator (solid teal #27ACB2, no extra deps) ────────
function createSolidPNG(width: number, height: number): Buffer {
  const [r, g, b] = [0x27, 0xac, 0xb2]; // #27ACB2

  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const off = y * rowSize;
    raw[off] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      raw[off + 1 + x * 3]     = r;
      raw[off + 1 + x * 3 + 1] = g;
      raw[off + 1 + x * 3 + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  const crc32 = (buf: Buffer): number => {
    let c = 0xffffffff;
    for (const byte of buf) {
      c ^= byte;
      for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return (c ^ 0xffffffff) >>> 0;
  };

  const mkChunk = (type: string, data: Buffer): Buffer => {
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
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  return Buffer.concat([
    Buffer.from('\x89PNG\r\n\x1a\n', 'binary'),
    mkChunk('IHDR', ihdr),
    mkChunk('IDAT', compressed),
    mkChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── LINE API helpers ──────────────────────────────────────────────────────────
async function lineApi(path: string, body: unknown): Promise<any> {
  const res = await fetch(`https://api.line.me/v2/bot${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`LINE API error ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function uploadRichMenuImage(richMenuId: string, png: Buffer): Promise<void> {
  const res = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'image/png',
      },
      body: png as unknown as BodyInit,
    },
  );
  if (!res.ok) {
    throw new Error(`Image upload failed ${res.status}: ${await res.text()}`);
  }
}

async function setDefaultRichMenu(richMenuId: string): Promise<void> {
  const res = await fetch(
    `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    },
  );
  if (!res.ok) throw new Error(`Set default failed ${res.status}: ${await res.text()}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🛒 Setting up LINE Rich Menu...');
  console.log(`   LIFF URL: ${LIFF_URL}`);

  // 1. Delete existing default rich menu (optional, ignore errors)
  await fetch('https://api.line.me/v2/bot/user/all/richmenu', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  }).catch(() => {});

  // 2. Create rich menu structure
  const { richMenuId } = await lineApi('/richmenu', {
    size: { width: 2500, height: 843 },
    selected: true,
    name: 'Main Menu',
    chatBarText: '🛒 สั่งอาหาร',
    areas: [
      {
        bounds: { x: 0, y: 0, width: 2500, height: 843 },
        action: { type: 'uri', label: 'สั่งอาหาร', uri: LIFF_URL },
      },
    ],
  });
  console.log(`✅ Rich menu created: ${richMenuId}`);

  // 3. Upload placeholder image (solid teal — replace with your own design)
  console.log('🖼  Generating placeholder image (2500x843 teal)...');
  const png = createSolidPNG(2500, 843);
  await uploadRichMenuImage(richMenuId, png);
  console.log('✅ Image uploaded');

  // 4. Set as default for all users
  await setDefaultRichMenu(richMenuId);
  console.log('✅ Rich menu set as default for all users');

  console.log('\n🎉 Done! Open LINE and you should see the rich menu.');
  console.log(`   Rich Menu ID: ${richMenuId}`);
  console.log('\n💡 To use a custom image, replace the PNG upload step');
  console.log('   with your own 2500x843 PNG/JPG file (< 1 MB).');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
