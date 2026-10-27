"""Crisp printed parts inside the Samsung RT34HG5A42BXHL, redrawn from Samsung's own open-door and close-up photos
(pipeline/sources/photos/samsung/g_550669408.jpg and g_550669412.jpg). Every word and icon is set again so it stays
sharp when zoomed in; sizes come from measuring the photos against the 1710 mm body (0.637 px/mm in the open-door photo).

Writes into <out dir>/samsung/:
  inner_panel.png     the touch display on the fridge's right wall: SAMSUNG, Freezer Convert, 2 C, -19 C, Wi-Fi, three keys
  back_freezer.png    the freezer's back duct: three vent slots, the Twin Cooling Plus badge, vents and the round grommet
  back_fridge.png     the fridge's back duct: tray icons, vents, the Twin Cooling Plus badge, grommet and the lower flap
  bigbox_print.png    "Big Box" and its three fruit icons, on the clear front of the big drawer (alpha)
  icemaker_print.png  "Movable Ice Maker" on the ice-maker tray (alpha)

usage: python tex_samsung_fridge.py <out dir>
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(sys.argv[1], "samsung")
os.makedirs(OUT, exist_ok=True)
AV = "/System/Library/Fonts/Avenir Next.ttc"
AVC = "/System/Library/Fonts/Avenir Next Condensed.ttc"
INK = (92, 97, 106)
S = 2  # supersampling, then reduced: keeps edges clean


def font(path, px, face=0):
    return ImageFont.truetype(path, round(px * S), index=face)


def save(img, name):
    img = img.resize((img.width // S, img.height // S), Image.LANCZOS)
    p = os.path.join(OUT, name)
    if name.startswith("back_"):
        img = img.convert("RGB").quantize(colors=96, method=Image.MEDIANCUT, dither=Image.NONE)
    img.save(p, optimize=True)
    print("wrote", p, img.size)


def line(d, pts, w, fill):
    d.line([(x * S, y * S) for x, y in pts], fill=fill, width=round(w * S), joint="curve")


def rrect(d, box, r, fill=None, outline=None, w=1):
    x0, y0, x1, y1 = [v * S for v in box]
    d.rounded_rectangle((x0, y0, x1, y1), r * S, fill=fill, outline=outline, width=round(w * S))


def text(d, xy, s, f, fill, anchor="mm", stroke=0, stroke_fill=None):
    d.text((xy[0] * S, xy[1] * S), s, font=f, fill=fill, anchor=anchor, stroke_width=round(stroke * S), stroke_fill=stroke_fill)


# ── the touch display: 68 x 120 mm, 12 px per mm ──
def deg_c(d, x, y, size, fill, edge):
    """the degree ring and a C, drawn apart so no combined glyph gets substituted"""
    r = size * 0.16
    d.ellipse(((x - r) * S, (y - size * 0.34 - r) * S, (x + r) * S, (y - size * 0.34 + r) * S), outline=edge, width=round(size * 0.14 * S))
    d.ellipse(((x - r) * S, (y - size * 0.34 - r) * S, (x + r) * S, (y - size * 0.34 + r) * S), outline=fill, width=round(size * 0.07 * S))
    text(d, (x + size * 0.55, y), "C", font(AV, size, 5), fill, stroke=round(size * 0.07), stroke_fill=edge)


def inner_panel():
    PX = 12
    w, h = 68 * PX, 120 * PX
    img = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rrect(d, (0, 0, w, h), 0.11 * w, fill=(245, 246, 248, 255), outline=(214, 217, 222, 255), w=6)
    rrect(d, (0.035 * w, 0.02 * h, 0.965 * w, 0.98 * h), 0.09 * w, outline=(228, 230, 234, 255), w=3)
    X = lambda f: f * w
    Y = lambda f: f * h
    text(d, (X(0.496), Y(0.105)), "SAMSUNG", font(AV, 70, 0), INK)
    # Freezer Convert: the label, and the tall frame that lights up with the mode
    text(d, (X(0.5), Y(0.222)), "Freezer", font(AV, 36, 7), INK)
    text(d, (X(0.5), Y(0.2525)), "Convert", font(AV, 36, 7), INK)
    bx0, bx1, by0, by1 = X(0.412), X(0.595), Y(0.262), Y(0.447)
    line(d, [(bx0, by0 - 2), (bx0, by1), (bx1, by1), (bx1, by0 - 2)], 6, INK)
    line(d, [(bx0, by0 - 2), (bx0 + 40, by0 - 2)], 6, INK)
    line(d, [(bx1 - 40, by0 - 2), (bx1, by0 - 2)], 6, INK)
    # the two temperatures: white light-up digits with a soft edge so they stay readable on the pale panel
    dig = font(AV, 94, 5)
    deg = font(AV, 47, 5)
    text(d, (X(0.645), Y(0.41)), "2", dig, (255, 255, 255, 255), stroke=6, stroke_fill=(168, 173, 182, 255))
    text(d, (X(0.77), Y(0.372)), "°C", deg, (255, 255, 255, 255), stroke=5, stroke_fill=(168, 173, 182, 255))
    text(d, (X(0.235), Y(0.515)), "-19", dig, (255, 255, 255, 255), stroke=6, stroke_fill=(168, 173, 182, 255))
    text(d, (X(0.40), Y(0.462)), "°C", deg, (255, 255, 255, 255), stroke=5, stroke_fill=(168, 173, 182, 255))
    # droplet (humidity) icon
    cx, cy = X(0.5), Y(0.5)
    pts = [(cx, cy - 46)]
    for a in range(-60, 241, 15):
        pts.append((cx + 30 * math.cos(math.radians(a)), cy + 14 + 30 * math.sin(math.radians(a))))
    d.polygon([(x * S, y * S) for x, y in pts], outline=(168, 173, 182, 255), fill=(255, 255, 255, 255))
    line(d, pts + [pts[0]], 3, (168, 173, 182, 255))
    # Wi-Fi icon
    wx, wy = X(0.5), Y(0.69)
    for r in (21, 40, 58):
        d.arc(((wx - r) * S, (wy - r + 18) * S, (wx + r) * S, (wy + r + 18) * S), 225, 315, fill=(168, 173, 182, 255), width=7 * S)
    d.ellipse(((wx - 7) * S, (wy + 28) * S, (wx + 7) * S, (wy + 42) * S), fill=(168, 173, 182, 255))
    # the three touch keys
    ky0, ky1 = Y(0.816), Y(0.915)
    line(d, [(X(0.33), ky0), (X(0.33), ky1)], 5, INK)
    line(d, [(X(0.66), ky0), (X(0.66), ky1)], 5, INK)
    text(d, (X(0.175), Y(0.868)), "Freezer", font(AV, 49, 7), INK)
    text(d, (X(0.495), Y(0.836)), "Freezer", font(AV, 49, 7), INK)
    text(d, (X(0.495), Y(0.868)), "Convert", font(AV, 49, 7), INK)
    text(d, (X(0.495), Y(0.898)), "(3 sec)", font(AV, 35, 7), INK)
    text(d, (X(0.83), Y(0.84)), "Fridge", font(AV, 54, 7), INK)
    text(d, (X(0.83), Y(0.872)), "Power Cool", font(AV, 38, 7), INK)
    text(d, (X(0.83), Y(0.902)), "(3 sec)", font(AV, 35, 7), INK)
    for fx in (0.175, 0.495, 0.83):
        line(d, [(X(fx) - 22, Y(0.935)), (X(fx) + 22, Y(0.935))], 4, (206, 209, 214, 255))
    save(img, "inner_panel.png")


# ── the Twin Cooling Plus badge: a blue dome with a brushed sweep, ring and white wordmark ──
def badge(d, cx, cy, r):
    for i in range(14):  # outer blue ring, light to dark
        k = i / 13
        col = (int(20 + 40 * k), int(88 + 52 * k), int(190 - 10 * k), 255)
        rr = r * (1 - 0.012 * i)
        d.ellipse(((cx - rr) * S, (cy - rr) * S, (cx + rr) * S, (cy + rr) * S), fill=col)
    ri = r * 0.84
    d.ellipse(((cx - ri) * S, (cy - ri) * S, (cx + ri) * S, (cy + ri) * S), fill=(48, 118, 204, 255))
    for k in range(40):  # brushed sweep: thin lighter wedges from the centre
        a0 = math.radians(k * 9 - 20)
        a1 = a0 + math.radians(3.5 if k % 2 else 2)
        shade = (96, 156, 228, 255) if k % 3 == 0 else (66, 134, 214, 255)
        d.pieslice(((cx - ri) * S, (cy - ri) * S, (cx + ri) * S, (cy + ri) * S), math.degrees(a0), math.degrees(a1), fill=shade)
    rj = r * 0.78
    d.ellipse(((cx - rj) * S, (cy - rj) * S, (cx + rj) * S, (cy + rj) * S), outline=(30, 86, 170, 255), width=round(0.025 * r * S))
    text(d, (cx - r * 0.04, cy + r * 0.04), "Twin Cooling", font(AV, r * 0.2, 0), (255, 255, 255, 255))
    text(d, (cx + r * 0.5, cy - r * 0.2), "Plus", font(AV, r * 0.11, 0), (255, 255, 255, 255))


def vent(d, cx, cy, ln, th=5, col=(78, 82, 88, 255)):
    rrect(d, (cx - ln / 2, cy - th / 2, cx + ln / 2, cy + th / 2), th / 2, fill=col)


def back_panel(name, w_mm, h_mm, build):
    PX = 4
    w, h = w_mm * PX, h_mm * PX
    img = Image.new("RGBA", (w * S, h * S), (246, 247, 249, 255))
    d = ImageDraw.Draw(img)
    rrect(d, (3, 3, w - 3, h - 3), 14, outline=(226, 229, 233, 255), w=3)
    build(d, w, h, PX)
    save(img, name)


def back_freezer():
    # the panel spans x +-188 mm and y 1208 to 1593 mm (385 mm high); marks are in mm from its top-left
    def b(d, w, h, PX):
        X = lambda mm: (mm + 188) * PX          # mm from the panel centre
        Y = lambda ym: (1593 - ym) * PX         # height above the floor in mm
        for x in (-112, 0, 118):
            vent(d, X(x), Y(1567), 62 * PX / 1, 5 * PX / 2)
        badge(d, X(8), Y(1512), 55 * PX)
        vent(d, X(100), Y(1385), 75 * PX, 5 * PX / 2)
        vent(d, X(-60), Y(1385), 40 * PX, 5 * PX / 2)
        d.ellipse((X(8) * S - 20 * PX * S, Y(1313) * S - 20 * PX * S, X(8) * S + 20 * PX * S, Y(1313) * S + 20 * PX * S), outline=(150, 154, 160, 255), width=3 * S)
        vent(d, X(60), Y(1263), 95 * PX, 5 * PX / 2)
        vent(d, X(-45), Y(1263), 25 * PX, 5 * PX / 2)
    back_panel("back_freezer.png", 376, 385, b)


def icon_box(d, cx, cy, s):
    rrect(d, (cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2), s * 0.12, outline=(112, 116, 124, 255), w=2.4)


def back_fridge():
    # the panel spans x +-150 mm and y 588 to 1106 mm (518 mm high)
    def b(d, w, h, PX):
        X = lambda mm: (mm + 150) * PX
        Y = lambda ym: (1106 - ym) * PX
        ink = (96, 100, 108, 255)
        for x in (-104, 120):
            vent(d, X(x), Y(1050), 60 * PX, 5 * PX / 2)
            vent(d, X(x), Y(956), 60 * PX, 5 * PX / 2)
        s = 25 * PX
        for i, x in enumerate((-27, 7, 41)):    # the three chiller icons printed on the tray's back: roast, fish, steak
            cx, cy = X(x), Y(1050)
            icon_box(d, cx, cy, s)
            if i == 0:
                d.ellipse((cx - s * 0.28) * S if False else (int((cx - s * 0.28) * S), int((cy - s * 0.24) * S), int((cx + s * 0.28) * S), int((cy + s * 0.32) * S)), outline=ink, width=2 * S)
                line(d, [(cx + s * 0.12, cy - s * 0.1), (cx + s * 0.3, cy - s * 0.3)], 2.2, ink)
            elif i == 1:
                d.ellipse((int((cx - s * 0.3) * S), int((cy - s * 0.14) * S), int((cx + s * 0.16) * S), int((cy + s * 0.14) * S)), outline=ink, width=2 * S)
                line(d, [(cx + s * 0.16, cy), (cx + s * 0.32, cy - s * 0.15)], 2.2, ink)
                line(d, [(cx + s * 0.16, cy), (cx + s * 0.32, cy + s * 0.15)], 2.2, ink)
                line(d, [(cx + s * 0.32, cy - s * 0.15), (cx + s * 0.32, cy + s * 0.15)], 2.2, ink)
            else:
                d.ellipse((int((cx - s * 0.3) * S), int((cy - s * 0.24) * S), int((cx + s * 0.3) * S), int((cy + s * 0.24) * S)), outline=ink, width=2 * S)
                d.ellipse((int((cx - s * 0.12) * S), int((cy - s * 0.1) * S), int((cx + s * 0.12) * S), int((cy + s * 0.12) * S)), outline=ink, width=2 * S)
        badge(d, X(8), Y(883), 55 * PX)
        d.ellipse((X(8) * S - 19 * PX * S, Y(703) * S - 19 * PX * S, X(8) * S + 19 * PX * S, Y(703) * S + 19 * PX * S), outline=(150, 154, 160, 255), width=3 * S)
        vent(d, X(-105), Y(808), 55 * PX, 5 * PX / 2)
        vent(d, X(118), Y(808), 60 * PX, 5 * PX / 2)
        rrect(d, (X(-148), Y(640), X(148), Y(588)), 6, fill=(240, 241, 244, 255), outline=(206, 209, 214, 255), w=3)
        line(d, [(X(-120), Y(618)), (X(120), Y(618))], 2.2, (190, 194, 200, 255))
    back_panel("back_fridge.png", 300, 518, b)


def bigbox_print():
    PX = 12   # 170 x 100 mm area on the drawer's clear front
    w, h = 170 * PX, 100 * PX
    img = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ink = (76, 80, 88, 255)
    text(d, (w / 2 - 6, 0.27 * h), "Big", font(AV, 178, 0), ink, anchor="rm")
    text(d, (w / 2 + 18, 0.27 * h), "Box", font(AV, 178, 7), ink, anchor="lm")
    s = 31 * PX
    for i, kind in enumerate(("orange", "grapes", "apple")):
        cx, cy = w / 2 + (i - 1) * 40 * PX, 0.62 * h
        icon_box(d, cx, cy, s)
        k = s
        if kind == "grapes":
            for r_ in range(3):
                for c_ in range(3 - r_):
                    x = cx + (c_ - (2 - r_) / 2) * k * 0.2
                    y = cy - k * 0.1 + r_ * k * 0.2
                    d.ellipse((int((x - k * 0.09) * S), int((y - k * 0.09) * S), int((x + k * 0.09) * S), int((y + k * 0.09) * S)), outline=ink, width=2 * S)
            line(d, [(cx, cy - k * 0.2), (cx + k * 0.08, cy - k * 0.34)], 2.2, ink)
        else:
            rr = k * 0.28
            d.ellipse((int((cx - rr) * S), int((cy - rr + k * 0.05) * S), int((cx + rr) * S), int((cy + rr + k * 0.05) * S)), outline=ink, width=2 * S)
            line(d, [(cx, cy - rr + k * 0.05), (cx + k * 0.1, cy - rr - k * 0.12)], 2.2, ink)
            if kind == "apple":
                d.arc((int((cx - rr * 0.5) * S), int((cy - rr * 0.6) * S), int((cx + rr * 0.1) * S), int((cy + rr * 0.1) * S)), 200, 290, fill=ink, width=2 * S)
    save(img, "bigbox_print.png")


def icemaker_print():
    PX = 12   # 150 x 24 mm
    w, h = 150 * PX, 24 * PX
    img = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ink = (62, 68, 78, 255)
    text(d, (w / 2 - 4, h / 2), "Movable", font(AV, 128, 0), ink, anchor="rm")
    text(d, (w / 2 + 14, h / 2), "Ice Maker", font(AV, 128, 7), ink, anchor="lm")
    save(img, "icemaker_print.png")


inner_panel()
back_freezer()
back_fridge()
bigbox_print()
icemaker_print()
