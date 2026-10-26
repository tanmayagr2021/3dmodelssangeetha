"""Textures for the Haier HSO52KU-CAI3NB-I (HSA52KU-CAI3NB-I) 1.5 ton Kinouchi Ultra indoor unit.
Printing is redrawn crisp on flat white from Haier India's own front photo (g16.jpg, 1200 x 1200; the
unit is 1.202 px per mm across, cols 50..1151; panel rows 447..724, gold strip rows 724..737).
usage: python tex_haier_hso52.py <photos dir> <logos dir> <out dir>
  photos: pipeline/sources/photos (reads haier_hso52/g16.jpg)
Writes into <out dir>/haier_hso52/.
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

PHOTOS, LOGOS, OUT = sys.argv[1:4]
rng = np.random.default_rng(7)
PRODUCT = "haier_hso52"
AV = "/System/Library/Fonts/Avenir Next.ttc"
AVC = "/System/Library/Fonts/Avenir Next Condensed.ttc"

S = 3.0                                   # px per mm in the panel texture
XIN, H, YG1 = 0.4465, 0.306, 0.0756         # half width of the panel (m), unit height, top of the gold strip


def save(img, name, quality=88):
    os.makedirs(os.path.join(OUT, PRODUCT), exist_ok=True)
    path = os.path.join(OUT, PRODUCT, name)
    if name.endswith(".jpg"):
        img.convert("RGB").save(path, quality=quality, optimize=True)
    else:
        img.save(path, optimize=True)
    print("wrote", path, img.size)


W_PX, H_PX = round(2 * XIN * 1000 * S), round((H - YG1) * 1000 * S)
X = lambda mm: W_PX / 2 + mm * S
Y = lambda m: (H - m) * 1000 * S


def seven(d, cx, cy, h, w, ch, col, t):
    """one seven-segment digit centred on (cx, cy)"""
    segs = {"0": "abcdef", "2": "abdeg", "6": "acdefg", "5": "acdfg"}[ch]
    x0, x1, y0, y1, ym = cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2, cy
    L = {"a": (x0, y0, x1, y0), "b": (x1, y0, x1, ym), "c": (x1, ym, x1, y1), "d": (x0, y1, x1, y1),
         "e": (x0, ym, x0, y1), "f": (x0, y0, x0, ym), "g": (x0, ym, x1, ym)}
    for s in segs:
        a, b, c, e = L[s]
        d.line((a, b, c, e), fill=col, width=round(t))


def snowflake(d, cx, cy, r, col, t):
    for k in range(6):
        a = math.radians(60 * k + 90)
        ex, ey = cx + r * math.cos(a), cy - r * math.sin(a)
        d.line((cx, cy, ex, ey), fill=col, width=round(t))
        for sgn in (-1, 1):
            b = a + sgn * math.radians(40)
            mx, my = cx + 0.62 * r * math.cos(a), cy - 0.62 * r * math.sin(a)
            d.line((mx, my, mx + 0.34 * r * math.cos(b), my - 0.34 * r * math.sin(b)), fill=col, width=round(t))


def panel():
    img = Image.new("RGB", (W_PX, H_PX), (247, 247, 248))
    g = np.linspace(1.0, 0.985, H_PX)[:, None, None]
    img = Image.fromarray((np.asarray(img).astype(float) * g).clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img, "RGBA")
    # Haier wordmark from Haier's own logo file, tinted charcoal as on the unit
    lg = Image.open(os.path.join(LOGOS, "haier.png")).convert("RGBA")
    a = np.asarray(lg).astype(float)
    col = np.zeros_like(a)
    col[:, :, 0], col[:, :, 1], col[:, :, 2] = 62, 66, 72
    col[:, :, 3] = a[:, :, 3]
    lg = Image.fromarray(col.astype(np.uint8))
    lg = lg.crop(lg.getbbox())
    w = round(53 * S)
    lg = lg.resize((w, round(w * lg.height / lg.width)), Image.LANCZOS)
    img.paste(lg, (round(X(0) - w / 2), round(Y(0.1812) - lg.height / 2)), lg)
    # the "26" display and the snowflake, faint like the lit-off display in the photo
    for k, ch in enumerate("26"):
        seven(d, X(311.6 - 10.5 + 21 * k), Y(0.1812), 26 * S, 13 * S, ch, (214, 218, 223, 255), 1.8 * S)
    snowflake(d, X(347), Y(0.1812), 8.5 * S, (66, 186, 224, 255), 1.5 * S)
    # DC inverter badge: DC in a heavy weight, inverter in a medium one, charcoal
    px = 15 * S
    for _ in range(40):                      # fit the badge to the 96 mm it has in the photo
        f1 = ImageFont.truetype(AVC, round(px), index=0)
        f2 = ImageFont.truetype(AVC, round(px), index=5)
        wdc, win = d.textlength("DC", font=f1), d.textlength("inverter", font=f2)
        if abs(wdc + win - 1.5 * S - 96 * S) < 1.5 * S:
            break
        px *= 96 * S / (wdc + win - 1.5 * S)
    tot = wdc + win - 1.5 * S
    x0 = X(370.6) - tot / 2
    d.text((x0, Y(0.0922)), "DC", font=f1, fill=(52, 56, 62), anchor="lm")
    d.text((x0 + wdc - 1.5 * S, Y(0.0922)), "inverter", font=f2, fill=(52, 56, 62), anchor="lm")
    save(img, "panel.jpg", 92)


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
