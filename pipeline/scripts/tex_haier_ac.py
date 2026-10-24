"""Textures for the Haier HSU18K-PYSG3BN-INV indoor unit (1.5 ton Kinouchi, Gold), from
Haier's own front photo (h0.jpg, 1200 x 1200, the unit about 1.21 px per mm).

usage: python tex_haier_ac.py <photos dir> <out dir>
  photos: the raw photos in pipeline/sources/photos/haier_ac
Writes into <out dir>/haier_ac/.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

PHOTOS, OUT = sys.argv[1:3]
rng = np.random.default_rng(7)
PRODUCT = "haier_ac"


def save(img, name, quality=88):
    os.makedirs(os.path.join(OUT, PRODUCT), exist_ok=True)
    path = os.path.join(OUT, PRODUCT, name)
    if name.endswith(".jpg"):
        img.convert("RGB").save(path, quality=quality, optimize=True)
    else:
        img.save(path, optimize=True)
    print("wrote", path, img.size)


# ── where the unit sits in h0.jpg (measured): 910 mm wide from x 52 to 1151 ──
X0, X1 = 52, 1151
PX_MM = (X1 - X0) / 910.0
CX = (X0 + X1) / 2
PANEL_TOP, GOLD_TOP = 440, 701      # rows: top edge of the front panel, top of the gold strip
PANEL_HALF_W = 443.0                # the panel spans x = +-443 mm, between the end caps


def panel():
    """Front panel, top edge to the gold strip: the Haier logo, the hidden 25 degree display
    and the DC inverter badge. The studio shading is divided out row by row, because the
    3D lighting shades the curved panel itself."""
    src = np.asarray(Image.open(os.path.join(PHOTOS, "h0.jpg")).convert("RGB")).astype(float)
    x0 = round(CX - PANEL_HALF_W * PX_MM)
    x1 = round(CX + PANEL_HALF_W * PX_MM)
    a = src[PANEL_TOP:GOLD_TOP, x0:x1].copy()
    lum = a.mean(axis=2)
    bg = np.median(lum, axis=1)[:, None]                   # background brightness of each row
    sat = a.max(axis=2) - a.min(axis=2)
    # keep only the printing (dark logo and badge, the faint display digits, the blue snowflake)
    # on a flat white, so no studio light is baked into the plastic
    ink = np.clip((bg - lum - 5) / 14, 0, 1)
    ink = np.maximum(ink, np.clip((sat - 12) / 20, 0, 1))
    ink = np.asarray(Image.fromarray((ink * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))).astype(float) / 255
    ink[-6:] = 0                                           # the panel's lower edge chamfer
    flat = np.full_like(a, 247.0)
    a = flat * (1 - ink[:, :, None]) + (a * (247.0 / bg)[:, :, None]) * ink[:, :, None]
    img = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    img = img.resize((2048, round(2048 * img.height / img.width)), Image.LANCZOS)
    save(img, "panel.jpg", 90)


def filters():
    """The two air filters behind the panel (left and right, each with a centre tab, as the
    manual shows), a fine mesh over the aluminium fins of the coil."""
    w, h = 1024, 512
    a = np.zeros((h, w, 3))
    # coil fins seen through the mesh: fine vertical lines
    fins = np.where((np.arange(w) % 4) < 2, 150.0, 178.0)
    a[:] = np.array([1.0, 1.01, 1.03])[None, None, :] * fins[None, :, None]
    a += rng.normal(0, 3, (h, w, 1))
    # the mesh: a light grey grid laid over the fins
    mesh = np.zeros((h, w), bool)
    mesh[::5, :] = True
    mesh[:, ::5] = True
    a[mesh] = a[mesh] * 0.35 + 232 * 0.65
    img = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    frame = (236, 238, 240)
    edge = (205, 208, 212)
    # outer frame, centre divider between the left and right filters
    d.rectangle((0, 0, w - 1, h - 1), outline=frame, width=16)
    d.rectangle((w // 2 - 10, 0, w // 2 + 10, h), fill=frame)
    d.line((w // 2, 0, w // 2, h), fill=edge, width=2)
    for cx in (w // 4, 3 * w // 4):
        # cross ribs of each filter frame
        for x in (cx - 128, cx + 128):
            d.rectangle((x - 4, 0, x + 4, h), fill=frame)
        d.rectangle((cx - w // 4 + 8, h // 2 - 4, cx + w // 4 - 8, h // 2 + 4), fill=frame)
        # the centre tab at the bottom, pushed up to release the filter
        d.rounded_rectangle((cx - 34, h - 70, cx + 34, h - 8), 8, fill=(244, 245, 246), outline=edge, width=3)
        d.rectangle((cx - 18, h - 52, cx + 18, h - 46), fill=edge)
    save(img, "filter.jpg", 86)


def top_grille():
    """The air inlet on top: rows of long slots, broken by ribs about every 83 mm as in the photo."""
    w, h = 1024, 128                 # spans x = +-443 mm and the top from the wall to the panel
    img = Image.new("RGB", (w, h), (243, 244, 245))
    d = ImageDraw.Draw(img)
    px = w / 886.0
    slot = (118, 122, 128)
    rows = [(14, 30), (40, 56), (66, 82), (92, 108)]
    x = 30.0
    while x < 856:
        x2 = min(x + 79, 856)
        for y0, y1 in rows:
            d.rounded_rectangle((round(x * px), y0, round(x2 * px), y1), 4, fill=slot)
        x += 83
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    save(img, "top.jpg", 86)


panel()
filters()
top_grille()
