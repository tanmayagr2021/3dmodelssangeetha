"""Textures for the LG FHB1208Z2M 8 kg front-load washer (Middle Black), from LG's own photos.

usage: python tex_lg_fhb1208.py <photos dir> <logos dir> <out dir>
  photos: lg_fhb1208/  gal1.jpg (front, 1.178 px/mm), gal2.jpg (the energy label), gal3.jpg (door open),
          DZ-10.jpg / DZ-11.jpg (right / left side), DZ-12.jpg (rear), manual_p21_panel.png (the control-panel
          drawing of LG's owner's manual MFL72036419, page 21, a vector drawing rendered at 1000 dpi)
  writes <out dir>/lg_fhb1208/

The photos are soft (the machine is 707 px across for 600 mm), so every word, number, icon and digit on the
control strip is redrawn crisp at 7.2 px/mm, placed where the photo has it (positions measured on gal1.jpg,
written below in millimetres from the left edge and down from the top edge of the front). Icons come from the
manual's vector drawing. The photo's studio shading is not baked in: the 3D lighting shades the model.
The typeface is not LG's own, so letter shapes differ slightly.
"""
import json
import math
import os
import sys
from collections import deque

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

Image.MAX_IMAGE_PIXELS = None
PHOTOS, LOGOS, OUT = sys.argv[1:4]
SRC = os.path.join(PHOTOS, "lg_fhb1208")
DEST = os.path.join(OUT, "lg_fhb1208")
os.makedirs(DEST, exist_ok=True)
FONT = "/System/Library/Fonts/Avenir Next.ttc"
S = 7.2                               # px per mm on the strip
SHADE = 0.80                          # textures render about 25% brighter under the viewer light
STRIP_H, DRAWER_W, W = 89.0, 212.0, 600.0
PANEL_W = W - DRAWER_W
HERE = os.path.dirname(os.path.abspath(__file__))


def save(img, name, q=90):
    p = os.path.join(DEST, name)
    if name.endswith(".png"):
        img.save(p, optimize=True)
    else:
        img.convert("RGB").save(p, quality=q, optimize=True)
    print("wrote", p, img.size)


def font(mm, face=7, s=S):
    return ImageFont.truetype(FONT, max(4, round(mm * s)), index=face)


def grey(v):
    return (round(v * SHADE),) * 3


STRIP = grey(78)                      # the strip's grey in the photo
PLATE = grey(64)                      # the front plate's grey


def text(d, xy, s, f, fill, anchor="mm"):
    d.text(xy, s, font=f, fill=fill, anchor=anchor)


def ink(path, box_thumb, thumb_w=2000, thr=90, flip=False):
    """Ink of one drawing in the manual's panel drawing: a (box in the 2000-px thumbnail) -> alpha array, tight."""
    man = np.asarray(Image.open(path).convert("L"))
    k = man.shape[1] / thumb_w
    x0, y0, x1, y1 = [round(v * k) for v in box_thumb]
    a = (255 - man[y0:y1, x0:x1]).astype(np.uint8)
    ys, xs = np.where(a > thr)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return a


def paste_ink(img, a, cx, cy, h_mm, colour, s=S):
    """Paste ink alpha scaled to a height in mm, centred at (cx, cy) in canvas px."""
    h = max(2, round(h_mm * s))
    w = max(2, round(a.shape[1] * h / a.shape[0]))
    al = Image.fromarray(a).resize((w, h), Image.LANCZOS)
    layer = Image.new("RGB", (w, h), colour)
    img.paste(layer, (round(cx - w / 2), round(cy - h / 2)), al)


def seven(box, digit, lit):
    """Polygons of one seven-segment digit; returns [(polygon, on)]."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    t = w * 0.19
    g = t * 0.55
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
    on = {"5": "afgcd", "0": "abcdef", "8": "abcdefg"}[digit] if lit else ""
    return [(pts, k in on) for k, pts in segs.items()]


def panel_strip():
    """The control strip right of the drawer: programme names round the dial, the display, the touch keys."""
    W_PX, H_PX = round(PANEL_W * S), round(STRIP_H * S)
    img = Image.new("RGB", (W_PX, H_PX), STRIP)
    d = ImageDraw.Draw(img, "RGBA")
    X = lambda x_abs: (x_abs - DRAWER_W) * S      # absolute mm from the left edge of the machine -> canvas px
    Y = lambda y: y * S
    lab, dim, faint = (214, 214, 218), (150, 150, 156), (120, 120, 126)

    # the dial's well: a slightly darker disc under the knob
    kx, ky = X(300.0), Y(39.9)
    for r, v in [(29.5, 0.90), (28.0, 0.80)]:
        d.ellipse([kx - r * S, ky - r * S, kx + r * S, ky + r * S], fill=(round(STRIP[0] * v),) * 3)

    # programme names: left list right-aligned to x = 263, right list left-aligned from x = 337.5
    f = font(4.1, 7)
    rows = [18.7, 29.7, 41.2, 52.2, 63.6]
    for name, y in zip(["Cotton", "Cotton+", "Mixed Fabric", "Quick 30", "Allergy Care"], rows):
        text(d, (X(263.0), Y(y)), name, f, lab, "rm")
        d.line([(X(266.2), Y(y)), (X(269.4), Y(y))], fill=faint, width=max(1, round(0.35 * S)))
    for name, y in zip(["Activewear", "Hand/Wool", "Delicates", "Tub Clean", "Rinse+Spin"], rows):
        text(d, (X(337.5), Y(y)), name, f, lab, "lm")
        if name == "Delicates":                                       # the lamp of the selected programme
            d.ellipse([X(332.8) - 0.9 * S, Y(y) - 0.9 * S, X(332.8) + 0.9 * S, Y(y) + 0.9 * S], fill=(250, 250, 252))
        else:
            d.line([(X(331.6), Y(y)), (X(334.6), Y(y))], fill=faint, width=max(1, round(0.35 * S)))

    # the display glass
    gx0, gy0, gx1, gy1 = X(415.8), Y(18.7), X(539.2), Y(64.5)
    d.rounded_rectangle([gx0, gy0, gx1, gy1], radius=round(1.6 * S), fill=(9, 9, 11))
    # four digits: 18:88 ghost, "50" lit on the last two as in LG's photo
    for (xa, digit, lit) in [(420.0, "8", False), (433.0, "8", False), (447.0, "5", True), (459.0, "0", True)]:
        for pts, on in seven((X(xa), Y(23.3), X(xa + 10.6), Y(43.3)), digit, lit):
            d.polygon(pts, fill=(250, 250, 253) if on else (30, 30, 33))
    for cy_ in (29.5, 37.0):                                           # the colon
        d.rectangle([X(444.6) - 0.7 * S, Y(cy_) - 0.7 * S, X(444.6) + 0.7 * S, Y(cy_) + 0.7 * S], fill=(30, 30, 33))
    # display icons from the manual's drawing (thumbnail coordinates of the 2000-px wide drawing)
    P = os.path.join(SRC, "manual_p21_panel.png")
    thumb = {"rinse": (1608, 155), "intensive": (1678, 155), "prewash": (1748, 155), "lock": (1608, 237), "clock": (1748, 237),
             "play": (1288, 327), "power": (1875, 327)}
    boxes = {k: (cx - 29, cy - 29, cx + 29, cy + 29) for k, (cx, cy) in thumb.items()}
    boxes["prewash"] = (1730, 138, 1768, 172)
    boxes["clock"] = (1730, 219, 1768, 255)
    boxes["play"] = (1255, 292, 1325, 362)
    boxes["power"] = (1840, 292, 1910, 362)
    icon = {k: ink(P, b) for k, b in boxes.items()}
    lit_c, off_c = (246, 246, 250), (132, 132, 138)
    for k, (xa, ya, h) in {"rinse": (481.5, 26.3, 5.6), "intensive": (492.2, 26.3, 5.6), "prewash": (502.8, 26.3, 5.6),
                           "lock": (481.5, 40.0, 5.6), "clock": (502.8, 40.0, 5.6)}.items():
        paste_ink(img, icon[k], X(xa), Y(ya), h, off_c)
    paste_ink(img, icon["play"], X(430.6), Y(53.9), 7.2, lit_c)
    paste_ink(img, icon["power"], X(523.1), Y(53.9), 7.6, lit_c)
    for xd in (446.3, 477.3, 507.9):
        d.line([(X(xd), Y(48.6)), (X(xd), Y(60.4))], fill=(190, 190, 196), width=max(1, round(0.3 * S)))
    for xa, a_, b_ in [(461.8, "Spin", "*Rinse+"), (492.4, "Temp.", "*Intensive")]:
        text(d, (X(xa), Y(52.2)), a_, font(4.4, 7), lit_c)
        text(d, (X(xa), Y(58.4)), b_, font(2.3, 7), dim)
    text(d, (X(524.2), Y(29.2)), "Delay End", font(4.6, 7), lit_c)
    text(d, (X(524.2), Y(34.0)), "*Pre Wash", font(2.3, 7), dim)
    text(d, (X(526.0), Y(13.7)), "*Hold 3 seconds", font(2.0, 7), dim)
    # child lock bracket under the Spin and Temp. keys
    cl_y = 67.5
    text(d, (X(477.3), Y(cl_y)), "*Child Lock", font(2.2, 7), dim)
    for x0_, x1_ in [(463.0, 470.6), (484.0, 491.6)]:
        d.line([(X(x0_), Y(cl_y)), (X(x1_), Y(cl_y))], fill=faint, width=max(1, round(0.3 * S)))
    # Smart Diagnosis mark at the right of the display
    sx, sy = X(549.0), Y(52.5)
    d.rounded_rectangle([sx - 2.0 * S, sy - 3.0 * S, sx + 0.6 * S, sy + 2.6 * S], radius=round(0.5 * S), outline=dim, width=max(1, round(0.3 * S)))
    for r_ in (2.0, 3.0):
        d.arc([sx - r_ * S + 1.4 * S, sy - r_ * S, sx + r_ * S + 1.4 * S, sy + r_ * S], -50, 50, fill=dim, width=max(1, round(0.3 * S)))
    text(d, (sx + 0.3 * S, Y(59.5)), "Smart", font(1.6, 7), faint)
    text(d, (sx + 0.3 * S, Y(61.3)), "Diagnosis", font(1.6, 7), faint)
    save(img.filter(ImageFilter.GaussianBlur(0.35)), "panel.jpg", 90)


def drawer_face():
    """The drawer face: LG logo, the 8 kg print, the finger pocket is geometry."""
    W_PX, H_PX = round(DRAWER_W * S), round(STRIP_H * S)
    img = Image.new("RGB", (W_PX, H_PX), STRIP)
    d = ImageDraw.Draw(img)
    lg = Image.open(os.path.join(LOGOS, "lg.png")).convert("RGBA")
    a = np.asarray(lg).astype(float)
    mark = np.zeros(a.shape, np.uint8)
    mark[..., :3] = (168, 170, 174)
    mark[..., 3] = (a[..., 3] * 0.95).clip(0, 255).astype(np.uint8)
    lg = Image.fromarray(mark)
    w = round(33.0 * S)
    lg = lg.resize((w, round(w * lg.height / lg.width)), Image.LANCZOS)
    img.paste(lg, (round(49.5 * S - lg.width / 2), round(18.7 * S - lg.height / 2)), lg)
    text(d, (170.0 * S, 34.8 * S), "8kg", font(6.6, 7), (205, 205, 210))
    save(img, "drawer.jpg", 90)


def front_plate():
    """The plain front plate (below the strip): its grey, and the Inverter Direct Drive print at the top right."""
    s = 3.0
    top_mm = STRIP_H                                            # the plate starts under the strip
    h_mm = 850.0 - STRIP_H - 14.0                           # plate height: from the feet (14 mm) up to the strip
    W_PX, H_PX = round(W * s), round(h_mm * s)
    img = Image.new("RGB", (W_PX, H_PX), PLATE)
    d = ImageDraw.Draw(img)
    Xp = lambda x: x * s
    Yp = lambda y_front: (y_front - top_mm) * s                 # y measured down from the top of the front
    c = (214, 214, 218)
    f = lambda mm, face=7: font(mm, face, s)
    text(d, (Xp(549.0), Yp(97.6)), "I N V E R T E R", f(1.5, 0), c)
    text(d, (Xp(549.0), Yp(103.6)), "DIRECT DRIVE", f(3.7, 0), c)
    text(d, (Xp(549.0), Yp(109.8)), "M O T O R", f(1.5, 0), c)
    # the 10 year warranty mark: a thin vertical bar, a big 1, a ring with the 0
    d.line([(Xp(567.3), Yp(95.6)), (Xp(567.3), Yp(111.6))], fill=c, width=max(1, round(0.28 * s)))
    text(d, (Xp(572.0), Yp(103.4)), "1", f(10.5, 8), c)
    cx_, cy_ = Xp(582.0), Yp(103.6)
    r_ = 4.1 * s
    d.ellipse([cx_ - r_, cy_ - r_, cx_ + r_, cy_ + r_], outline=c, width=max(2, round(0.9 * s)))
    d.ellipse([cx_ - 1.3 * s, cy_ - 1.3 * s, cx_ + 1.3 * s, cy_ + 1.3 * s], fill=c)
    text(d, (Xp(583.0), Yp(110.4)), "YEAR WARRANTY", f(1.1, 7), c)
    save(img.filter(ImageFilter.GaussianBlur(0.3)), "front.jpg", 88)


def knob_top():
    """Spun dark-chrome top of the dial: concentric rings, bright arcs top-left and bottom-right, a cone at the centre."""
    n = 512
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    cx = cy = n / 2
    r = np.hypot(xx - cx, yy - cy) / (n / 2)
    th = np.arctan2(yy - cy, xx - cx)
    v = 42 + 90 * np.maximum(np.cos(th - 2.35) ** 10, np.cos(th + 0.8) ** 10) * np.clip(r * 1.1, 0, 1)
    v += 8 * np.sin(r * 140) + 4 * np.sin(r * 53)
    v += 22 * np.exp(-((r - 0.97) / 0.03) ** 2)                          # a bright edge
    v = np.where(r < 0.18, 38 + 70 * np.clip(np.cos(th - 2.35), 0, 1) ** 2 * (r / 0.18), v)
    v = np.clip(v, 0, 255) * 0.9
    img = np.stack([v, v, v + 3], axis=2).clip(0, 255).astype(np.uint8)
    save(Image.fromarray(img), "knob_top.jpg", 92)


def label_decal():
    """The energy-label sticker, die-cut, from LG's own label photo for this model (0.07 kWh/kg/cycle, 5 star)."""
    src = Image.open(os.path.join(SRC, "gal2.jpg")).convert("RGB")
    sa = np.asarray(src).astype(int)
    cols = np.arange(sa.shape[1])[None, :]
    ys_, xs_ = np.where((sa.sum(2) < 735) & (cols < 1000))
    lab = src.crop((xs_.min() + 6, ys_.min() + 6, xs_.max() - 4, ys_.max() - 4)).convert("RGBA")
    px = lab.load()
    w, h = lab.size
    seen = np.zeros((h, w), bool)
    q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y, x]:
            continue
        r, g, bl, _ = px[x, y]
        if min(r, g, bl) < 205 and not (r > 235 and g < 215):
            continue
        seen[y, x] = True
        px[x, y] = (r, g, bl, 0)
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    alpha = lab.getchannel("A")
    lab = lab.convert("RGB").quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA")
    lab.putalpha(alpha)
    save(lab, "label.png")
    print("label size", lab.size)


def stickers():
    """The two white transport stickers on the front plate beside the gasket (gal3): barcode blocks and small prints."""
    rng = np.random.default_rng(3)

    def sticker(name, w, h, vertical):
        img = Image.new("RGB", (w, h), (246, 246, 244))
        d = ImageDraw.Draw(img)
        if not vertical:
            for k, x in enumerate((8, w - 78)):                       # two QR-like squares
                d.rectangle([x, 8, x + 62, 70], fill=(30, 30, 30))
                for _ in range(90):
                    a, b = rng.integers(0, 56), rng.integers(0, 56)
                    d.rectangle([x + 3 + a, 11 + b, x + 7 + a, 15 + b], fill=(246, 246, 244) if rng.random() < 0.5 else (30, 30, 30))
            for i in range(5):
                d.rectangle([90, 12 + i * 12, 90 + rng.integers(150, 260), 18 + i * 12], fill=(60, 60, 60))
        else:
            for i in range(7):
                d.rectangle([10, 14 + i * 26, 10 + rng.integers(36, 70), 30 + i * 26], fill=(70, 70, 70))
            d.rectangle([10, h - 70, w - 10, h - 14], fill=(30, 30, 30))
            for x in range(14, w - 14, 7):
                d.rectangle([x, h - 66, x + rng.integers(1, 4), h - 20], fill=(246, 246, 244))
        save(img, name, 88)
    sticker("sticker_top.jpg", 420, 120, False)
    sticker("sticker_side.jpg", 110, 360, True)


def drum_texture():
    """Stainless drum wall: fine dimples in rows (the embossed drum), brushed steel between."""
    w, h = 1024, 512
    rng = np.random.default_rng(5)
    base = np.full((h, w), 168.0)
    base += rng.normal(0, 3, (h, w))
    img = Image.fromarray(base.clip(0, 255).astype(np.uint8)).convert("RGB")
    d = ImageDraw.Draw(img)
    pitch = 32
    for j, y in enumerate(range(8, h, pitch)):
        for x in range(8 + (pitch // 2 if j % 2 else 0), w, pitch):
            d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=(92, 94, 99))
            d.ellipse([x - 4, y - 4, x + 3, y + 3], fill=(188, 190, 195))
    save(img.filter(ImageFilter.GaussianBlur(0.6)), "drum.jpg", 88)


def sides_and_rear():
    """Side panels and the rear from LG's photos; the rear loses its hoses and cord (they are rebuilt in 3D)."""
    for name, f in (("side_r.jpg", "DZ-10.jpg"), ("side_l.jpg", "DZ-11.jpg")):
        im = Image.open(os.path.join(SRC, f)).convert("RGB")
        a = np.asarray(im).astype(int)
        m = a.sum(2) < 700
        ys, xs = np.where(m)
        y0, y1 = ys.min(), ys.max()
        row = m[y0 + 12]                                          # a row through the top plate: front to back, 550 mm
        cols = np.where(row)[0]
        x0, x1 = cols.min(), cols.max()
        side = im.crop((x0, y0 + 10, x1, y1 - 40))                # from under the top plate down to above the feet
        print(f, "top plate cols", x0, x1, "size", side.size)
        side = side.resize((side.width * 3 // 4, side.height * 3 // 4), Image.LANCZOS)
        save(side, name, 86)

    paths = json.load(open(os.path.join(HERE, "..", "tex", "lg_fhb1208", "rear_paths.json")))
    im = Image.open(os.path.join(SRC, "DZ-12.jpg")).convert("RGB").crop((596, 85, 1413, 1243))
    arr = np.asarray(im).copy()
    lum = arr.astype(np.float32).mean(axis=2)
    corridor = np.zeros(arr.shape[:2], np.uint8)
    for key, rad in (("hose", 44), ("cord", 30), ("loop", 30)):
        cv2.polylines(corridor, [np.array(paths[key], np.float32).round().astype(np.int32)], False, 255, rad * 2)
    cv2.circle(corridor, (406, 140), 40, 255, -1)
    px, py = paths["plug"]
    cv2.circle(corridor, (round(px), round(py)), 48, 255, -1)
    cv2.circle(corridor, (783, 1062), 30, 255, -1)
    for (bx, by) in paths["bolts"]:                                  # the transit bolts stay
        cv2.circle(corridor, (bx, by), 36, 0, -1)
    plate_core = np.zeros(arr.shape[:2], np.uint8)
    cv2.rectangle(plate_core, (176, 312), (644, 984), 255, -1)
    mask = ((lum > 52) & (corridor > 0) & (plate_core == 0)).astype(np.uint8) * 255
    # where the cord loop dips onto the silver plate, paint it out by its path
    loop = np.zeros_like(mask)
    cv2.polylines(loop, [np.array(paths["loop"], np.float32).round().astype(np.int32)], False, 255, 46)
    mask[(loop > 0) & (plate_core > 0)] = 255
    mask[(loop > 0) & (np.arange(arr.shape[0])[:, None] > 270) & (np.arange(arr.shape[0])[:, None] < 372)] = 255
    mask[(loop > 0) & (lum > 52)] = 255
    cv2.rectangle(mask, (20, 300), (110, 360), 255, -1)            # the hose clamp and label on the left
    cv2.rectangle(mask, (700, 320), (780, 370), 255, -1)           # the clip on the right
    cv2.rectangle(mask, (24, 480), (100, 600), 255, -1)            # the hose holder at bottom left
    mask[:, :14] = 0
    mask[:, -14:] = 0
    mask = cv2.dilate(mask, np.ones((9, 9), np.uint8))
    mask[:, :10] = 0
    mask[:, -10:] = 0
    out = cv2.inpaint(arr, mask, 9, cv2.INPAINT_NS)
    # outside the silver tub plate the back is plain dark metal: fill the gaps with its own smooth colour
    body = cv2.GaussianBlur(out, (0, 0), 6)
    plate = np.zeros(mask.shape, np.uint8)
    cv2.rectangle(plate, (150, 285), (670, 1010), 255, -1)
    fill = (mask > 0) & (plate == 0)
    out[fill] = (body[fill] * 0.6 + out[fill] * 0.4).astype(np.uint8)
    save(Image.fromarray(out), "rear.jpg", 86)


def hose_texture():
    w, h = 64, 16
    img = Image.new("RGB", (w, h), (118, 121, 126))
    d = ImageDraw.Draw(img)
    for x in range(0, w, 8):
        d.rectangle([x + 5, 0, x + 7, h], fill=(70, 72, 76))
        d.rectangle([x, 0, x + 2, h], fill=(150, 153, 158))
    save(img, "hose.jpg", 88)


if __name__ == "__main__":
    panel_strip()
    drawer_face()
    front_plate()
    knob_top()
    label_decal()
    stickers()
    drum_texture()
    hose_texture()
    if os.path.exists(os.path.join(HERE, "..", "tex", "lg_fhb1208", "rear_paths.json")):
        sides_and_rear()
