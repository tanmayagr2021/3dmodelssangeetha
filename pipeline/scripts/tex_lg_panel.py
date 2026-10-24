"""LG FHP1412Z9B control strip, detergent-drawer face, knob top and button caps, from a straight-on photo
of LG's own control panel, with every piece of text and every display icon redrawn crisp.

usage: python tex_lg_panel.py <photos dir> <out dir> [--compare <png>]
  photos: lg/panel_front.jpg   2172 x 724, the whole front strip seen from the front: the body is 2166 px
                               wide for 600 mm (3.61 px/mm), the strip is 105 mm tall (850 mm down to 745 mm).
          ../lg-panel/manual_p21_diagram.png  the control-panel diagram of LG's owner's manual for this model
                               (MFL72036403, page 21), a vector drawing rendered at 1000 dpi
  writes <out dir>/lg/: panel.jpg (strip right of the drawer, 390 x 105 mm), drawer.jpg (the drawer face),
         knob_top.jpg, btn_power.jpg, btn_play.jpg; all at 7.2 px/mm (twice the photo)

How it works. The photo is soft at 3.6 px/mm, so its words are blurry when the camera is close. Each word is
erased from an upscaled copy of the photo (inpainting only its own pixels) and set again in a clean humanist
sans, stretched to exactly the box that the word has in the photo, in the colour the photo gives it (white,
the red of "Allergy Care", the grey of unlit display words). The display icons come from the manual's vector
drawing, scaled into the photo's icon boxes. The seven-segment digits are drawn from polygons. The surface,
rings, leader lines, buttons and logo stay the photograph. The boxes below were measured on the photo.
The typeface is not LG's own; LG's panel uses a wider custom face, so letter shapes differ slightly.
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

Image.MAX_IMAGE_PIXELS = None
PHOTOS, OUT = sys.argv[1:3]
COMPARE = sys.argv[4] if len(sys.argv) > 4 and sys.argv[3] == "--compare" else None
HERE = os.path.dirname(os.path.abspath(__file__))
S = 2                                      # output pixels per photo pixel
TOP, BOTTOM = 150, 554                     # strip rows in the photo: top of the unit down to just under the 'WARRANTY' print (112 mm)
DRAWER_X0, DRAWER_X1, RIGHT = 4, 762, 2170
FONT = "/System/Library/Fonts/Avenir Next.ttc"
KNOB_C, KNOB_R = (1107.5, 375), (106.5, 101)
WHITE, RED = (236, 236, 240), (232, 52, 108)

# (text, photo box x0, y0, x1, y1, colour or None to take it from the photo, face index 5=Medium 7=Regular)
WORDS = [
    ("Cotton+", (818, 245, 891, 260), WHITE, 7), ("TurboWash 39", (818, 275, 944, 291), WHITE, 7),
    ("Mixed Fabric", (819, 305, 931, 320), WHITE, 7), ("Easy Care", (819, 337, 904, 355), WHITE, 7),
    ("Silent Wash", (818, 367, 918, 383), WHITE, 7), ("Allergy Care", (818, 398, 926, 418), RED, 7),
    ("Hand/Wool", (1283, 247, 1382, 262), WHITE, 7), ("Sportswear", (1284, 277, 1382, 296), WHITE, 7),
    ("Speed 14", (1299, 306, 1382, 325), WHITE, 7), ("Duvet", (1331, 337, 1382, 351), WHITE, 7),
    ("Tub Clean", (1292, 369, 1381, 384), WHITE, 7), ("Download Cycle", (1240, 401, 1381, 421), WHITE, 7),
    ("Steam", (1538, 421, 1589, 440), WHITE, 5), ("TurboWash", (1634, 422, 1724, 441), WHITE, 5),
    ("Pre Wash", (1757, 423, 1833, 442), WHITE, 5), ("Delay End", (1869, 423, 1950, 443), WHITE, 5),
    ("Add Item", (1989, 424, 2065, 443), WHITE, 5),
    ("*Wrinkle Care", (1524, 449, 1599, 462), WHITE, 7), ("*Rinse+", (1656, 450, 1698, 463), WHITE, 7),
    ("*Intensive", (1766, 451, 1820, 464), WHITE, 7), ("*Wi-Fi", (1891, 452, 1926, 464), WHITE, 7),
    ("*Remote Start", (1985, 452, 2065, 465), WHITE, 7),
    ("*Beep On/Off", (1685, 478, 1765, 497), (214, 214, 218), 7), ("*Child Lock", (1931, 478, 1996, 496), (214, 214, 218), 7),
    ("Smart", (786, 510, 819, 520), WHITE, 7), ("Diagnosis™", (778, 522, 833, 532), WHITE, 7),
    ("INVERTER", (1941, 507, 2002, 515), WHITE, 0), ("DIRECT DRIVE", (1925, 520, 2017, 531), WHITE, 0),
    ("MOTOR", (1954, 536, 1990, 544), WHITE, 0), ("WARRANTY", (2035, 540, 2075, 547), WHITE, 0),
    ("Cold", (1803, 270, 1841, 284), None, 7), ("20°C", (1860, 271, 1899, 284), None, 7), ("30°C", (1923, 271, 1962, 284), None, 7),
    ("40°C", (1801, 306, 1842, 320), None, 5), ("60°C", (1859, 306, 1898, 320), None, 7), ("95°C", (1922, 306, 1962, 320), None, 7),
    ("No", (1817, 356, 1840, 369), None, 7), ("400", (1866, 356, 1896, 369), None, 7), ("800", (1926, 357, 1956, 370), None, 7),
    ("1000", (1802, 390, 1841, 403), None, 7), ("1200", (1859, 390, 1900, 403), None, 5), ("1400", (1923, 390, 1962, 403), None, 7),
    ("Temp.", (1997, 285, 2058, 305), (240, 240, 244), 5), ("Spin", (1999, 369, 2041, 389), (240, 240, 244), 5),
    ("*Extra Function : Hold 3 seconds", (1907, 213, 2077, 223), (222, 222, 226), 7),
]
# display icons: (photo box, manual box in the 1800-px thumbnail of the diagram, lit?)
ICONS = [
    ((1528, 252, 1551, 279), (1030, 114, 1062, 146), False), ((1595, 254, 1619, 278), (1111, 115, 1143, 142), True),
    ((1662, 254, 1686, 278), (1193, 115, 1225, 142), True), ((1729, 254, 1755, 280), (1274, 115, 1306, 143), True),
    ((1527, 360, 1547, 385), (1028, 276, 1064, 304), False), ((1579, 362, 1602, 383), (1092, 281, 1121, 303), False),
    ((1630, 362, 1652, 384), (1153, 277, 1182, 304), False), ((1681, 363, 1702, 384), (1213, 277, 1243, 303), False),
    ((1731, 362, 1752, 388), (1275, 277, 1305, 305), False),
]
MK = 5230 / 1800.0                          # manual thumbnail -> full-resolution pixels


def erase(canvas, mask1):
    """Inpaint the photo pixels of `mask1` (photo resolution) on the upscaled canvas."""
    m = cv2.resize(mask1.astype(np.uint8) * 255, None, fx=S, fy=S, interpolation=cv2.INTER_NEAREST)
    m = cv2.dilate(m, np.ones((3, 3), np.uint8))
    return cv2.inpaint(canvas, m, 3, cv2.INPAINT_TELEA)


def text_layer(text, aspect, face):
    """White text on black, tight ink box, at a large size (for scaling down). When the word is set wider than its
    natural shape (the photo's INVERTER / MOTOR are widely spaced capitals), letter spacing is added instead of
    stretching the letters."""
    f = ImageFont.truetype(FONT, 160, index=face)
    bb = f.getbbox(text)
    nat = (bb[2] - bb[0]) / max(1, bb[3] - bb[1])
    gap = 0
    if aspect > nat * 1.18 and len(text) > 2:
        gap = (aspect * (bb[3] - bb[1]) - (bb[2] - bb[0])) / (len(text) - 1)
        W = int(sum(f.getlength(c) for c in text) + gap * len(text)) + 40
        im = Image.new("L", (W, bb[3] - bb[1] + 40), 0)
        dr = ImageDraw.Draw(im)
        x = 20
        for c in text:
            dr.text((x, 20 - bb[1]), c, font=f, fill=255)
            x += f.getlength(c) + gap
    else:
        im = Image.new("L", (bb[2] - bb[0] + 8, bb[3] - bb[1] + 8), 0)
        ImageDraw.Draw(im).text((4 - bb[0], 4 - bb[1]), text, font=f, fill=255)
    a = np.asarray(im)
    ys, xs = np.where(a > 40)
    return Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1])


def paste_alpha(canvas, alpha, x, y, colour):
    h, w = alpha.shape
    region = canvas[y:y + h, x:x + w].astype(np.float32)
    a = (alpha.astype(np.float32) / 255)[..., None]
    canvas[y:y + h, x:x + w] = (region * (1 - a) + np.array(colour, np.float32) * a).clip(0, 255).astype(np.uint8)


def photo_colour(V, rgb, box, lit_fraction=0.82):
    x0, y0, x1, y1 = box
    v = V[y0:y1, x0:x1]
    sel = v >= v.max() * lit_fraction
    return tuple(int(c) for c in rgb[y0:y1, x0:x1][sel].mean(axis=0))


def seven(box, digit):
    """Polygons of a seven-segment digit (hexagonal bars) in canvas pixels, and which of them are lit."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    t = w * 0.21
    g = t * 0.62                                           # how far each bar stops short of the corners
    xl, xr, yt, ym, yb = t / 2, w - t / 2, t / 2, h / 2, h - t / 2

    def bar(p0, p1):
        p0, p1 = np.array(p0, float), np.array(p1, float)
        d = (p1 - p0) / np.linalg.norm(p1 - p0)
        n = np.array([-d[1], d[0]])
        c = t / 2
        pts = [p0, p0 + d * c + n * c, p1 - d * c + n * c, p1, p1 - d * c - n * c, p0 + d * c - n * c]
        return [(x0 + px, y0 + py) for px, py in pts]
    segs = {"a": bar((xl + g, yt), (xr - g, yt)), "g": bar((xl + g, ym), (xr - g, ym)), "d": bar((xl + g, yb), (xr - g, yb)),
            "f": bar((xl, yt + g), (xl, ym - g * 0.5)), "e": bar((xl, ym + g * 0.5), (xl, yb - g)),
            "b": bar((xr, yt + g), (xr, ym - g * 0.5)), "c": bar((xr, ym + g * 0.5), (xr, yb - g))}
    on = {"3": "abgcd", "9": "abfgcd", "8": "abcdefg"}[digit]
    return segs, on


def main():
    src = Image.open(os.path.join(PHOTOS, "lg", "panel_front.jpg")).convert("RGB")
    rgb = np.asarray(src).copy()
    V = rgb.max(axis=2)
    canvas = np.asarray(src.resize((src.width * S, src.height * S), Image.LANCZOS)).copy()

    # ── 1. erase the blurry words, icons and digits from the upscaled photo ──
    mask = np.zeros(V.shape, bool)

    def text_mask(box, pad=2):
        x0, y0, x1, y1 = box
        sub = V[y0 - pad:y1 + pad, x0 - pad:x1 + pad].astype(np.float32)
        border = np.concatenate([sub[0], sub[-1], sub[:, 0], sub[:, -1]])
        bg = np.median(border)
        m = sub > bg + 0.28 * (sub.max() - bg)
        out = np.zeros(V.shape, bool)
        out[y0 - pad:y1 + pad, x0 - pad:x1 + pad] = m
        return out

    colours = {}
    for text, box, colour, face in WORDS:
        colours[text] = colour or photo_colour(V, rgb, box)
        mask |= text_mask(box)
    for pbox, _, _ in ICONS:
        mask |= text_mask(pbox, pad=3)
    mask |= text_mask((1572, 251, 1576, 280), pad=2)                       # the thin divider beside the first icon
    canvas = erase(canvas, mask)

    # the digits: dark display glass behind them
    glass = np.array([8, 8, 9], np.uint8)
    canvas[(294 - 6) * S:(360 + 6) * S, (1556 - 4) * S:(1724 + 6) * S] = glass

    # ── 2. set the words ──
    for text, box, _, face in WORDS:
        x0, y0, x1, y1 = box
        layer = text_layer(text, (x1 - x0) / (y1 - y0), face)
        w, h = (x1 - x0) * S, (y1 - y0) * S
        a = np.asarray(layer.resize((w, h), Image.LANCZOS))
        paste_alpha(canvas, a, x0 * S, y0 * S, colours[text])

    # ── 3. the display icons, from the manual's vector drawing ──
    man = np.asarray(Image.open(os.path.join(HERE, "..", "sources", "lg-panel", "manual_p21_diagram.png")).convert("L"))
    for pbox, mbox, lit in ICONS:
        mx0, my0, mx1, my1 = [round(v * MK) for v in mbox]
        ink = (255 - man[my0:my1, mx0:mx1]).astype(np.uint8)
        ys, xs = np.where(ink > 60)
        ink = ink[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        x0, y0, x1, y1 = pbox
        w, h = (x1 - x0) * S, (y1 - y0) * S
        a = np.asarray(Image.fromarray(ink).resize((w, h), Image.LANCZOS))
        paste_alpha(canvas, a, x0 * S, y0 * S, (246, 246, 250) if lit else (96, 96, 102))
    canvas[252 * S:279 * S, 1572 * S:1575 * S] = (240, 240, 244)          # the divider, crisp

    # ── 4. the digits ──
    img = Image.fromarray(canvas)
    d = ImageDraw.Draw(img)
    for (x0, x1), digit, lit in [((1556, 1592), "8", False), ((1598, 1634), "8", False), ((1646, 1680), "3", True), ((1688, 1724), "9", True)]:
        segs, on = seven((x0 * S, 294 * S, x1 * S, 360 * S), digit)
        for k, pts in segs.items():
            colour = (250, 250, 252) if (lit and k in on) else (30, 30, 33)
            d.polygon(pts, fill=colour)
    for cy in (312, 342):
        d.rectangle([1639 * S, cy * S, 1643 * S, (cy + 5) * S], fill=(30, 30, 33))
    canvas = np.asarray(img).copy()

    # ── 5. the knob well and the final crops ──
    yy, xx = np.mgrid[0:canvas.shape[0], 0:canvas.shape[1]]
    inside = ((xx / S - KNOB_C[0]) / (KNOB_R[0] + 7)) ** 2 + ((yy / S - KNOB_C[1]) / (KNOB_R[1] + 7)) ** 2 < 1
    soft = cv2.GaussianBlur(inside.astype(np.float32), (0, 0), 5)[..., None]
    canvas = (canvas * (1 - soft) + np.array([14, 14, 16], np.float32) * soft).clip(0, 255).astype(np.uint8)
    full = Image.fromarray(canvas)

    os.makedirs(os.path.join(OUT, "lg"), exist_ok=True)
    panel = full.crop((DRAWER_X1 * S, TOP * S, RIGHT * S, BOTTOM * S))
    panel.save(os.path.join(OUT, "lg", "panel.jpg"), quality=90, optimize=True)
    drawer = full.crop((DRAWER_X0 * S, TOP * S, DRAWER_X1 * S, BOTTOM * S)).filter(ImageFilter.UnsharpMask(2, 60, 2))
    drawer.save(os.path.join(OUT, "lg", "drawer.jpg"), quality=90, optimize=True)
    print("wrote panel.jpg", panel.size, "drawer.jpg", drawer.size)

    kb = (round(KNOB_C[0] - KNOB_R[0]), round(KNOB_C[1] - KNOB_R[1]), round(KNOB_C[0] + KNOB_R[0]), round(KNOB_C[1] + KNOB_R[1]))
    src.crop(kb).resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, "lg", "knob_top.jpg"), quality=92)
    for name, power in (("btn_power", True), ("btn_play", False)):
        n = 256
        im = Image.new("RGB", (n, n), (38, 38, 42))
        bd = ImageDraw.Draw(im)
        for r in range(n // 2, 0, -2):
            v = 20 + int(14 * (1 - r / (n / 2)))
            bd.ellipse([n / 2 - r, n / 2 - r, n / 2 + r, n / 2 + r], fill=(v, v, v + 3))
        if power:
            bd.arc([n * 0.28, n * 0.3, n * 0.72, n * 0.74], 300, 240, fill=(246, 246, 250), width=n // 14)
            bd.line([(n / 2, n * 0.2), (n / 2, n * 0.5)], fill=(246, 246, 250), width=n // 14)
        else:
            bd.polygon([(n * 0.3, n * 0.3), (n * 0.3, n * 0.7), (n * 0.56, n * 0.5)], fill=(246, 246, 250))
            bd.rectangle([n * 0.62, n * 0.3, n * 0.69, n * 0.7], fill=(246, 246, 250))
        im.save(os.path.join(OUT, "lg", name + ".jpg"), quality=92)

    if COMPARE:
        ref = src.crop((DRAWER_X1, TOP, RIGHT, BOTTOM)).resize(panel.size, Image.LANCZOS)
        both = Image.new("RGB", (panel.width, panel.height * 2 + 6), "white")
        both.paste(ref, (0, 0))
        both.paste(panel, (0, panel.height + 6))
        both.save(COMPARE)


main()
