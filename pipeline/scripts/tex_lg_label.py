"""LG FHP1412Z9B energy-label sticker (BEE "Power Savings Guide", 5 star, 0.05 kWh/kg/cycle, 12.0 kg), redrawn crisp
as a die-cut decal.

usage: python tex_lg_label.py <photos dir> <out dir> [--compare <png>]
  photos: lg/bee_label.jpg   465 x 847, a straight-on photo of this model's own BEE label (it names FHP1412Z9B/2025);
                             the sticker is 450 px wide for 64 mm (7.0 px/mm)
  writes <out dir>/lg/label.jpg (768 x 1409, 12 px/mm; the builder cuts the sticker's arched outline in the geometry)

LG's gallery and Sangeetha's listing show a label for FHP1410Z3M (10 kg), so neither is used. BEE's register lists
FHP1412Z9B as a 12 kg, 5-star front loader valid to 31 Dec 2026, which this label matches.

How it works. The photo is too soft to enlarge, so the label is drawn again: the arch, star band, black band, boxes and
rules as shapes, and every word set in Arial, stretched to exactly the ink box that the word has in the photo (each box is
found by thresholding the photo inside a search window). Only the two pictures, the hand-with-notes emblem and the BEE
logo, stay the photograph (upscaled). Arial is not the label's own typeface, so letter shapes differ slightly.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

PHOTOS, OUT = sys.argv[1:3]
COMPARE = sys.argv[4] if len(sys.argv) > 4 and sys.argv[3] == "--compare" else None
SUP = "/System/Library/Fonts/Supplemental/"
BOLD, BLACK, NARROW, REG = SUP + "Arial Bold.ttf", SUP + "Arial Black.ttf", SUP + "Arial Narrow.ttf", SUP + "Arial.ttf"

X0, Y0, X1, Y1 = 7.5, 11, 457.5, 836.5           # the sticker's die-cut edge in the photo
W = 768                                          # 12 px/mm across 64 mm
K = W / (X1 - X0)
H = round((Y1 - Y0) * K)
SS = 3                                           # drawn at 3x, then reduced (smooth edges)

INK, RED, GREEN = (26, 26, 24), (227, 1, 15), (17, 154, 72)
CREAM, RING, INNER, DISC = (255, 251, 221), (248, 247, 190), (255, 248, 178), (247, 246, 224)

CX, BASE = 232.5, 237.5                          # centre of the arches and the line where the black band starts
# (text, font, search window in the photo x0, y0, x1, y1, ink: "dark" on cream, "light" on black or green)
WORDS = [
    ("MORE STARS", BLACK, (160, 187, 305, 207), "dark"), ("MORE SAVINGS", BLACK, (150, 207, 316, 227), "dark"),
    ("POWER SAVINGS", BLACK, (40, 252, 430, 293), "light"), ("GUIDE", BLACK, (150, 295, 320, 332), "light"),
    ("ENERGY CONSUMPTION", BOLD, (92, 458, 374, 476), "dark"), ("0.05*", BOLD, (150, 478, 320, 501), "light"),
    ("kWh/kg/cycle", BOLD, (150, 503, 320, 522), "dark"),
    ("Label Period : 1st Jan 2024 - 31st Dec 2026", BOLD, (90, 526, 375, 542), "dark"),
    ("BEE/LG/21/001/19", BOLD, (185, 780, 280, 793), "dark"),
    ("*Under test conditions, when tested in accordance with latest IEC 60456 standards.", NARROW, (84, 797, 382, 810), "dark"),
    ("Actual energy consumption will depend on how the appliance is being used.", NARROW, (84, 810, 382, 823), "dark"),
]
RULES = [558.5, 579.5, 599.5, 620, 640.5, 660.5, 681]       # the table's lines
ROWS = [("Appliance", ": Washing Machine"), ("Brand", ": LG"), ("Model/Year", ": FHP1412Z9B/2025"),
        ("Type", ": Front Load"), ("Load Capacity", ": 12.0 kg"), ("Water Consumption", ": 8.5 L/kg/cycle")]
STARS = [(160, "1"), (123, "2"), (90, "3"), (57, "4"), (20, "5")]   # angle round the arch centre, number
EMBLEM, BEE = ((232, 392.5), 47), ((231, 739.5), 36.5)            # circles: centre and radius in the photo


def P(x, y):
    """Photo pixels -> supersampled canvas pixels."""
    return ((x - X0) * K * SS, (y - Y0) * K * SS)


def ink_box(a, win, kind):
    x0, y0, x1, y1 = win
    sub = a[y0:y1, x0:x1]
    m = sub.sum(2) < 330 if kind == "dark" else sub.min(2) > 185
    ys, xs = np.where(m)
    return x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1


def text_layer(text, font):
    """White text on black, cropped to its ink, at a large size (for scaling down)."""
    f = ImageFont.truetype(font, 200)
    bb = f.getbbox(text)
    im = Image.new("L", (bb[2] - bb[0] + 20, bb[3] - bb[1] + 20), 0)
    ImageDraw.Draw(im).text((10 - bb[0], 10 - bb[1]), text, font=f, fill=255)
    a = np.asarray(im)
    ys, xs = np.where(a > 40)
    return Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1])


def set_text(canvas, text, font, box, colour):
    """Stretch the word to the photo's ink box and paint it."""
    (ax, ay), (bx, by) = P(box[0], box[1]), P(box[2], box[3])
    lay = text_layer(text, font).resize((max(1, round(bx - ax)), max(1, round(by - ay))), Image.LANCZOS)
    canvas.paste(Image.new("RGB", lay.size, colour), (round(ax), round(ay)), lay)


def arch(d, rx, ry, fill, outline=None, width=0, cx=CX):
    """Upper half-ellipse standing on the BASE line."""
    (ax, ay), (bx, by) = P(cx - rx, BASE - ry), P(cx + rx, BASE + ry)
    d.pieslice((ax, ay, bx, by), 180, 360, fill=fill, outline=outline, width=round(width * K * SS))


def star(d, cx, cy, r_out, rot):
    pts = []
    for i in range(10):
        r = r_out if i % 2 == 0 else r_out * 0.42
        t = np.radians(rot - 90 + i * 36)
        pts.append(P(cx + r * np.cos(t), cy + r * np.sin(t)))
    d.polygon(pts, fill=(255, 255, 255))


def picture(canvas, photo, circle, inset):
    """The photo inside a circle, upscaled to the canvas."""
    (cx, cy), r = circle
    r -= inset
    crop = photo.crop((round(cx - r), round(cy - r), round(cx + r), round(cy + r)))
    (ax, ay), (bx, by) = P(cx - r, cy - r), P(cx + r, cy + r)
    size = round(bx - ax)
    crop = crop.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    canvas.paste(crop, (round(ax), round(ay)), mask)


def main():
    photo = Image.open(os.path.join(PHOTOS, "lg", "bee_label.jpg")).convert("RGB")
    a = np.asarray(photo).astype(int)
    canvas = Image.new("RGB", (W * SS, H * SS), (255, 255, 255))
    d = ImageDraw.Draw(canvas)

    # the die-cut sticker: a white margin, then the black-edged label with its arched top
    arch(d, 225, 226.5, (255, 255, 255))
    d.rectangle((*P(X0, BASE), *P(X1, Y1)), fill=(255, 255, 255))
    arch(d, 215, 217.5, RING, INK, 2)
    d.rectangle((*P(17.5, BASE - 1), *P(447.5, 826)), fill=CREAM, outline=INK, width=round(2 * K * SS))
    arch(d, 207, 200, RED, cx=233)
    arch(d, 99, 100, INNER, INK, 1.5)

    # the black band and its chevron down to the emblem
    d.polygon([P(17.5, BASE), P(447.5, BASE), P(447.5, 285), P(CX, 408), P(17.5, 285)], fill=INK)
    (cx, cy), r = EMBLEM
    d.ellipse((*P(cx - r, cy - r), *P(cx + r, cy + r)), fill=DISC, outline=INK, width=round(2.5 * K * SS))

    for ang, n in STARS:
        t = np.radians(ang)
        sx, sy = 233 + 154 * np.cos(t), BASE - 154 * np.sin(t)
        star(d, sx, sy, 35, 90 - ang)
        f = ImageFont.truetype(REG, round(19 * K * SS))
        x, y = P(sx, sy + 1)
        d.text((x, y), n, font=f, fill=INK, anchor="mm")

    # the energy box: frame, green band, the rule above the label period
    d.rectangle((*P(86.5, 454.5), *P(377.5, 543.5)), outline=INK, width=round(2.5 * K * SS))
    d.rectangle((*P(87.5, 476), *P(376.5, 501)), fill=GREEN)
    d.line((*P(86.5, 523.5), *P(377.5, 523.5)), fill=INK, width=round(2 * K * SS))

    # the table and the rule over the footnote
    for y in RULES:
        d.line((*P(86, y), *P(379, y)), fill=INK, width=round(2 * K * SS))
    d.line((*P(86, 793.5), *P(379, 793.5)), fill=INK, width=round(1.5 * K * SS))

    for text, font, win, kind in WORDS:
        set_text(canvas, text, font, ink_box(a, win, kind), INK if kind == "dark" else (255, 255, 255))
    for (label, value), top, bottom in zip(ROWS, RULES[:-1], RULES[1:]):
        set_text(canvas, label, BOLD, ink_box(a, (87, round(top) + 3, 223, round(bottom) - 2), "dark"), INK)
        set_text(canvas, value, BOLD, ink_box(a, (223, round(top) + 3, 378, round(bottom) - 2), "dark"), INK)

    picture(canvas, photo, EMBLEM, 3)
    picture(canvas, photo, BEE, 0)

    # the decal's own outline is the die-cut (an arch 32 mm across on a 64 x 117.4 mm sticker), so no transparency is needed
    lab = canvas.resize((W, H), Image.LANCZOS)
    os.makedirs(os.path.join(OUT, "lg"), exist_ok=True)
    path = os.path.join(OUT, "lg", "label.jpg")
    lab.save(path, quality=92, optimize=True)
    print("wrote", path, lab.size, os.path.getsize(path), "bytes")

    if COMPARE:
        side = photo.crop((round(X0), round(Y0), round(X1), round(Y1))).resize((W, H), Image.LANCZOS)
        out = Image.new("RGB", (W * 2 + 20, H), (120, 120, 120))
        out.paste(side, (0, 0))
        out.paste(lab, (W + 20, 0))
        out.save(COMPARE)


main()
