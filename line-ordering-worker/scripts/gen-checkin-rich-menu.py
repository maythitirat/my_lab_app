"""
Generate a 2500x843 LINE rich menu image for Check-in / Check-out:
  Left panel:  🟢 เช็คอิน   (green gradient)
  Right panel: 🔴 เช็คเอาท์  (red gradient)

Run: python3 scripts/gen-checkin-rich-menu.py
Output: scripts/checkin-rich-menu.png
"""

from PIL import Image, ImageDraw, ImageFont
import os

W, H   = 2500, 843
COL_W  = W // 2   # 1250 per panel

THAI_FONT = '/System/Library/Fonts/Supplemental/Thonburi.ttc'
OUT = os.path.join(os.path.dirname(__file__), 'checkin-rich-menu.png')

PANELS = [
    {
        'x': 0, 'label': 'เช็คอิน',  'sub': 'Check-in',
        'icon': '🟢',
        'c1': (6,  199, 85),    # LINE green light  #06C755
        'c2': (0,  150, 60),    # darker green
    },
    {
        'x': COL_W, 'label': 'เช็คเอาท์', 'sub': 'Check-out',
        'icon': '🔴',
        'c1': (255, 80,  70),   # bright red
        'c2': (180, 20,  20),   # darker red
    },
]

# ── Build gradient image ───────────────────────────────────────────────────────
img = Image.new('RGB', (W, H))
pixels = img.load()

for p in PANELS:
    x0, c1, c2 = p['x'], p['c1'], p['c2']
    for y in range(H):
        t = y / (H - 1)
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        for x in range(COL_W):
            pixels[x0 + x, y] = (r, g, b)

draw = ImageDraw.Draw(img, 'RGBA')

# ── Divider line ───────────────────────────────────────────────────────────────
draw.rectangle([COL_W - 2, 0, COL_W + 2, H], fill=(255, 255, 255, 120))

# ── Font loader ────────────────────────────────────────────────────────────────
def load_font(size):
    for path in [
        THAI_FONT,
        '/usr/share/fonts/truetype/tlwg/TlwgTypo.ttf',
        '/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    ]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()

font_icon  = load_font(160)
font_label = load_font(110)
font_sub   = load_font(62)

# ── Draw each panel ────────────────────────────────────────────────────────────
shadow = (0, 0, 0, 80)

for p in PANELS:
    cx = p['x'] + COL_W // 2
    cy = H // 2

    # ── Icon (drawn as text - emoji may not render on server, use circle instead)
    circle_r = 90
    circle_color = (255, 255, 255, 60)
    draw.ellipse(
        [cx - circle_r, cy - 200 - circle_r, cx + circle_r, cy - 200 + circle_r],
        fill=circle_color,
    )

    # ── Main label ─────────────────────────────────────────────────────────────
    bbox = draw.textbbox((0, 0), p['label'], font=font_label)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = cx - tw // 2
    ty = cy - th // 2 - 20

    draw.text((tx + 4, ty + 4), p['label'], font=font_label, fill=shadow)
    draw.text((tx, ty), p['label'], font=font_label, fill=(255, 255, 255))

    # ── Sub label ──────────────────────────────────────────────────────────────
    sbbox = draw.textbbox((0, 0), p['sub'], font=font_sub)
    sw = sbbox[2] - sbbox[0]
    sx = cx - sw // 2
    sy = ty + th + 20

    draw.text((sx + 2, sy + 2), p['sub'], font=font_sub, fill=shadow)
    draw.text((sx, sy), p['sub'], font=font_sub, fill=(255, 255, 255, 200))

# ── Save ───────────────────────────────────────────────────────────────────────
img.save(OUT, 'PNG', optimize=True)
print(f'✅  Saved: {OUT}  ({W}x{H})')
