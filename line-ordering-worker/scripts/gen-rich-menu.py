"""
Generate a 2500x843 LINE rich menu image with 3 panels:
  1. สั่งสินค้า   (teal)
  2. แก้ไขออเดอร์  (blue)
  3. ยกเลิกออเดอร์ (red)

Run: python3 scripts/gen-rich-menu.py
Output: scripts/rich-menu.png
"""

from PIL import Image, ImageDraw, ImageFont
import math, os, sys

W, H = 2500, 843
THAI_FONT = '/System/Library/Fonts/Supplemental/Thonburi.ttc'
OUT = os.path.join(os.path.dirname(__file__), 'rich-menu.png')

PANELS = [
    {
        'x': 0,    'w': 833,  'cx': 416,
        'label': 'สั่งสินค้า',
        'c1': (0, 186, 158),   # top — lighter teal
        'c2': (0, 120, 100),   # bot — darker teal
        'icon': 'bag',
    },
    {
        'x': 833,  'w': 834,  'cx': 1250,
        'label': 'แก้ไขออเดอร์',
        'c1': (66, 145, 235),  # top — lighter blue
        'c2': (21, 101, 192),  # bot — darker blue
        'icon': 'edit',
    },
    {
        'x': 1667, 'w': 833,  'cx': 2083,
        'label': 'ยกเลิกออเดอร์',
        'c1': (239, 83,  80),  # top — lighter red
        'c2': (183, 28,  28),  # bot — darker red
        'icon': 'cancel',
    },
]

# ── Build gradient image ───────────────────────────────────────────────────────
img = Image.new('RGB', (W, H))
pixels = img.load()

for p in PANELS:
    x0, pw = p['x'], p['w']
    c1, c2 = p['c1'], p['c2']
    for y in range(H):
        t = y / (H - 1)
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        for x in range(x0, x0 + pw):
            pixels[x, y] = (r, g, b)

draw = ImageDraw.Draw(img, 'RGBA')

# ── Dividers ──────────────────────────────────────────────────────────────────
for xd in [833, 1667]:
    draw.rectangle([xd - 2, 0, xd + 1, H], fill=(255, 255, 255, 80))

# ── Fonts ─────────────────────────────────────────────────────────────────────
try:
    fnt_label   = ImageFont.truetype(THAI_FONT, 70)
    fnt_sublabel = ImageFont.truetype(THAI_FONT, 36)
except Exception as e:
    print(f'Font error: {e}', file=sys.stderr)
    fnt_label = fnt_sublabel = ImageFont.load_default()

# ── Icon + label helpers ───────────────────────────────────────────────────────
ICON_CY  = H // 2 - 55   # vertical center of icon
ICON_R   = 115            # icon circle radius
LABEL_Y  = ICON_CY + ICON_R + 32

WHITE      = (255, 255, 255, 255)
WHITE_SOFT = (255, 255, 255,  55)
WHITE_TIP  = (255, 230, 190, 245)
PINK_TIP   = (255, 190, 190, 245)


def rot_pt(ox, oy, px, py, angle_rad):
    c, s = math.cos(angle_rad), math.sin(angle_rad)
    return (int(ox + px * c - py * s),
            int(oy + px * s + py * c))


def draw_bag(cx, cy):
    """Shopping bag icon."""
    lw = 13
    # Body
    bx, by = cx - 54, cy - 32
    draw.rounded_rectangle([bx, by, bx + 108, by + 92], radius=10, fill=WHITE)
    # Handle cutout (erase top part of body with panel color — use semi-transparent overlay)
    draw.rectangle([bx + 6, by, bx + 102, by + 18], fill=(0, 0, 0, 0))
    # Handles (two vertical bars + arc top)
    hx1, hx2 = cx - 26, cx + 26
    top_y = by - 52
    draw.line([hx1, by, hx1, top_y], fill=WHITE, width=lw)
    draw.line([hx2, by, hx2, top_y], fill=WHITE, width=lw)
    # Arch connecting the handles
    draw.arc([hx1 - 1, top_y - 14, hx2 + 1, top_y + 14],
             start=180, end=0, fill=WHITE, width=lw)
    # Round caps at base of handles
    r = lw // 2 + 1
    for x in [hx1, hx2]:
        draw.ellipse([x - r, by - r, x + r, by + r], fill=WHITE)


def draw_edit(cx, cy):
    """Pencil / edit icon."""
    angle = math.radians(-38)

    def rp(px, py):
        return rot_pt(cx + 12, cy + 10, px, py, angle)

    L, hw = 130, 22  # half-length, half-width
    # Body
    body = [rp(-L + 28, -hw), rp(L - 18, -hw - 5),
            rp(L - 18, hw + 5), rp(-L + 28, hw)]
    draw.polygon(body, fill=WHITE)
    # Tip
    tip = [rp(-L, 0), rp(-L + 28, -hw), rp(-L + 28, hw)]
    draw.polygon(tip, fill=WHITE_TIP)
    # Eraser cap
    eraser = [rp(L - 18, -hw - 5), rp(L, -hw - 5 + 4),
              rp(L, hw + 5 - 4),   rp(L - 18, hw + 5)]
    draw.polygon(eraser, fill=PINK_TIP)
    # Eraser divider line
    div = [rp(L - 18, -hw - 5), rp(L - 18, hw + 5)]
    draw.line(div, fill=(255, 255, 255, 160), width=3)
    # Pencil lines (decoration)
    for offset in [-7, 0, 7]:
        a = rp(-L + 60, offset)
        b = rp(L - 35, offset)
        draw.line([a, b], fill=(255, 255, 255, 40), width=2)


def draw_cancel(cx, cy):
    """Bold X icon with rounded ends."""
    r  = 68
    lw = 20
    # Two diagonal lines
    draw.line([cx - r, cy - r, cx + r, cy + r], fill=WHITE, width=lw)
    draw.line([cx + r, cy - r, cx - r, cy + r], fill=WHITE, width=lw)
    # Round caps
    cap_r = lw // 2 + 1
    for dx, dy in [(-r, -r), (r, -r), (-r, r), (r, r)]:
        draw.ellipse([cx + dx - cap_r, cy + dy - cap_r,
                      cx + dx + cap_r, cy + dy + cap_r], fill=WHITE)


ICON_FUNCS = {'bag': draw_bag, 'edit': draw_edit, 'cancel': draw_cancel}

# ── Render each panel ─────────────────────────────────────────────────────────
for p in PANELS:
    cx = p['cx']

    # Glow circle behind icon
    draw.ellipse(
        [cx - ICON_R, ICON_CY - ICON_R, cx + ICON_R, ICON_CY + ICON_R],
        fill=WHITE_SOFT,
    )

    # Icon
    ICON_FUNCS[p['icon']](cx, ICON_CY)

    # Label — drop shadow then white text
    text = p['label']
    bb   = fnt_label.getbbox(text)
    tw   = bb[2] - bb[0]
    tx   = cx - tw // 2
    draw.text((tx + 2, LABEL_Y + 2), text, font=fnt_label, fill=(0, 0, 0, 90))
    draw.text((tx,     LABEL_Y),     text, font=fnt_label, fill=WHITE)

# ── Save ──────────────────────────────────────────────────────────────────────
img.save(OUT, optimize=True)
print(f'✅  Saved {OUT}  ({W}x{H})')
