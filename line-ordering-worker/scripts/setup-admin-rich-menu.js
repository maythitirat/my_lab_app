/**
 * Setup a separate admin-only rich menu.
 *
 * Layout (2×2 grid, 2500×1686):
 *  ┌─────────────────┬─────────────────┐
 *  │  🛒 สร้างออเดอร์  │  📦 จัดการสินค้า  │
 *  ├─────────────────┼─────────────────┤
 *  │  📊 ดูรายงาน    │  📤 ส่งออก CSV   │
 *  └─────────────────┴─────────────────┘
 *
 * Run:
 *   python3 scripts/gen-admin-rich-menu.py && node scripts/setup-admin-rich-menu.js
 */
const fs   = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ACCESS_TOKEN       = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const ADMIN_USER_ID      = process.env.LINE_ADMIN_USER_ID;
const LIFF_ID            = process.env.LIFF_ID || '2009692421-qzL3USNe';
const ADMIN_PRODUCTS_URL  = `https://liff.line.me/${LIFF_ID}/admin/products`;
const ADMIN_ORDER_URL     = `https://liff.line.me/${LIFF_ID}/admin/create-order`;
const ADMIN_MENU_IMAGE    = path.join(__dirname, 'admin-rich-menu.png');

if (!ACCESS_TOKEN) {
  console.error('LINE_CHANNEL_ACCESS_TOKEN is not set');
  process.exit(1);
}
if (!ADMIN_USER_ID) {
  console.error('LINE_ADMIN_USER_ID is not set');
  process.exit(1);
}

async function lineApi(p, body) {
  const res = await fetch(`https://api.line.me/v2/bot${p}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`LINE API ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function uploadImage(richMenuId, filePath) {
  const buf = fs.readFileSync(filePath);
  const res = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    { method: 'POST', headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'image/png' }, body: buf },
  );
  if (!res.ok) throw new Error(`Image upload ${res.status}: ${await res.text()}`);
}

async function main() {
  console.log(`🔧 Setting up ADMIN rich menu for user: ${ADMIN_USER_ID}`);

  // 1. Remove any existing rich menu assigned to admin
  await fetch(`https://api.line.me/v2/bot/user/${ADMIN_USER_ID}/richmenu`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  }).catch(() => {});

  // 2. Create the admin rich menu structure
  const { richMenuId } = await lineApi('/richmenu', {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: 'Admin Menu',
    chatBarText: '🔧 แอดมิน',
    areas: [
      // Row 1 — left: สร้างออเดอร์
      {
        bounds: { x: 0, y: 0, width: 1250, height: 843 },
        action: { type: 'uri', label: 'สร้างออเดอร์', uri: ADMIN_ORDER_URL },
      },
      // Row 1 — right: จัดการสินค้า
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 843 },
        action: { type: 'uri', label: 'จัดการสินค้า', uri: ADMIN_PRODUCTS_URL },
      },
      // Row 2 — left: ดูรายงาน
      {
        bounds: { x: 0, y: 843, width: 1250, height: 843 },
        action: { type: 'message', label: 'ดูรายงาน', text: 'รายงาน' },
      },
      // Row 2 — right: ส่งออก CSV
      {
        bounds: { x: 1250, y: 843, width: 1250, height: 843 },
        action: { type: 'message', label: 'ส่งออก CSV', text: 'ส่งออก' },
      },
    ],
  });
  console.log(`✅ Admin rich menu created: ${richMenuId}`);

  // 3. Upload image
  if (fs.existsSync(ADMIN_MENU_IMAGE)) {
    console.log('🖼  Uploading admin-rich-menu.png...');
    await uploadImage(richMenuId, ADMIN_MENU_IMAGE);
    console.log('✅ Image uploaded');
  } else {
    console.warn('⚠️  admin-rich-menu.png not found — menu has no image. Run gen-admin-rich-menu.py first.');
  }

  // 4. Assign ONLY to the admin user (NOT default for all users)
  const setRes = await fetch(
    `https://api.line.me/v2/bot/user/${ADMIN_USER_ID}/richmenu/${richMenuId}`,
    { method: 'POST', headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
  );
  if (!setRes.ok) throw new Error(`Assign failed: ${await setRes.text()}`);
  console.log(`✅ Admin rich menu assigned to user ${ADMIN_USER_ID}`);

  console.log('\n🎉 Done! Admin will now see a different rich menu in LINE.');
  console.log(`   Admin LIFF url: ${ADMIN_PRODUCTS_URL}`);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
