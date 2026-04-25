"""
Generate a 2500x1686 admin LINE rich menu image with 2x2 grid:
  Row 1 left:  สร้างออเดอร์  (green)
  Row 1 right: จัดการสินค้า  (teal)
  Row 2 left:  ดูรายงาน     (blue)
  Row 2 right: ส่งออก CSV   (purple)

Run: python3 scripts/gen-admin-rich-menu.py
Output: scripts/admin-rich-menu.png
"""

from PIL import Image, ImageDraw, ImageFont
import os, sys

W, H    = 2500, 1686   # LINE allows up to 2500x1686 for compact size
ROW_H   = H // 2       # 843 per row
COL_W   = W // 2       # 1250 per col

THAI_FONT = '/System/Library/Fonts/Supplemental/Thonburi.ttc'
OUT = os.path.join(os.path.dirname(__file__), 'admin-rich-menu.png')

PANELS = [
    # (col, row, label, icon, gradient_top, gradient_bot)
    {
        'col': 0, 'row': 0,
        'label': 'สร้างออเดอร์',
        'sub':   'แทนลูกค้า',
        'icon': 'cart',
        'c1': (39, 174, 96),    # green light
        'c2': (24, 130, 66),    # green dark
    },
    {
        'col': 1, 'row': 0,
        'label': 'จัดการสินค้า',
        'sub':   'เพิ่ม / แก้ไข',
        'icon': 'box',
        'c1': (0, 186, 158),    # teal light
        'c2': (0, 120, 100),    # teal dark
    },
    {
        'col': 0, 'row': 1,
        'label': 'ดูรายงาน',
        'sub':   'ยอดขายประจำวัน',
        'icon': 'chart',
        'c1': (66, 145, 235),   # blue light
        'c2': (21, 101, 192),   # blue dark
    },
    {
        'col': 1, 'row': 1,
        'label': 'ส่งออก CSV',
        'sub':   'ดาวน์โหลดข้อมูล',
        'icon': 'export',
        'c1': (155, 89, 182),   # purple light
        'c2': (108, 52, 131),   # purple dark
    },
]

# ── Build gradient image ────────────────────────────────────────────────────
img = Image.new('RGB', (W, H))
pixels = img.load()

for p in PANELS:
    x0 = p['col'] * COL_W
    y0 = p['row'] * ROW_H
    c1, c2 = p['c1'], p['c2']
    for dy in range(ROW_H):
        t = dy / (ROW_H - 1)
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        for dx in range(COL_W):
            pixels[x0 + dx, y0 + dy] = (r, g, b)

draw = ImageDraw.Draw(img, 'RGBA')

# ── Grid lines ──────────────────────────────────────────────────────────────
LINE_CLR = (255, 255, 255, 100)
# vertical center
draw.rectangle([COL_W - 2, 0, COL_W + 2, H], fill=LINE_CLR)
# horizontal center
draw.rectangle([0, ROW_H - 2, W, ROW_H + 2], fill=LINE_CLR)

# ── Font loader ─────────────────────────────────────────────────────────────
def load_font(size):
    for path in [
        THAI_FONT,
        '/usr/share/fonts/truetype/tlwg/TlwgTypo.ttf',
        '/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf',
    ]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()

font_big  = load_font(110)
font_small = load_font(62)

ICONS = {
    'cart':   '🛒',
    'box':    '📦',
    'chart':  '📊',
    'export': '📤',
}

# ── Draw labels ──────────────────────────────────────────────────────────────
for p in PANELS:
    cx = p['col'] * COL_W + COL_W // 2
    cy = p['row'] * ROW_H + ROW_H // 2
    shadow = (0, 0, 0, 80)

    # Main label
    bbox = draw.textbbox((0, 0), p['label'], font=font_big)
    tw   = bbox[2] - bbox[0]
    th   = bbox[3] - bbox[1]
    tx   = cx - tw // 2
    ty   = cy - th // 2 - 40

    # Shadow
    draw.text((tx + 4, ty + 4), p['label'], font=font_big, fill=shadow)
    draw.text((tx, ty), p['label'], font=font_big, fill=(255, 255, 255))

    # Sub label
    sbbox = draw.textbbox((0, 0), p['sub'], font=font_small)
    sw    = sbbox[2] - sbbox[0]
    draw.text((cx - sw // 2 + 2, ty + th + 24), p['sub'], font=font_small, fill=shadow)
    draw.text((cx - sw // 2, ty + th + 20), p['sub'], font=font_small, fill=(255, 255, 255, 200))

img.save(OUT, 'PNG')
print(f'✅ Saved {OUT} ({W}x{H})')
