"""Textures for the LG GLT4626TMPZ 466 L double-door refrigerator (Shiny Steel).

usage: python tex_lg_glt4626.py <photos dir> <logos dir> <out dir>
  photos: lg_glt4626/GLT4626TMPZ-2010x1334-2-v.jpg (the energy label), GLT4626TMPZ-DZ-12.jpg (rear)
  logos:  lg.png
  writes <out dir>/lg_glt4626/*.jpg|png (the food labels, cans, LG mark and Convertible / Fresh Zone prints are shared with lg_glt3426, made by tex_lg_glt3426.py)

Steel: the real doors are PET film printed to look like steel, a soft vertical grain on a mid silver (about 176 grey).
The model's own lighting does the shading, so the texture holds only the grain, not the photo's studio gradient.
Printed items are separate small decals so each stays crisp: the energy label (LG's own copy for this model), the LG mark,
the "Convertible" and "Fresh Zone" prints inside, the dial scale, and the labels on the stocked food (plain words, no brands).
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

PHOTOS, LOGOS, OUT = sys.argv[1:4]
D = os.path.join(OUT, "lg_glt4626")
os.makedirs(D, exist_ok=True)
rng = np.random.default_rng(46)
FONT = "/System/Library/Fonts/Avenir Next.ttc"


def font(px, face=7):
    return ImageFont.truetype(FONT, px, index=face)


def save(img, name, q=88):
    p = os.path.join(D, name)
    if name.endswith(".png"):
        img.save(p, optimize=True)
    else:
        img.convert("RGB").save(p, quality=q, optimize=True)
    print("wrote", p, img.size)


def steel(w, h, base=(157, 157, 158), grain=0.85):
    """Vertical-grain brushed silver: long streaks, faint."""
    n = rng.normal(0, 1, (1, w // 2 + 1))
    n = np.repeat(n, h, axis=0)
    n = np.repeat(n, 2, axis=1)[:, :w]
    img = Image.fromarray(((n * 0.5 + 0.5).clip(0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur((1.2, 40)))
    a = (np.asarray(img).astype(float) / 255 - 0.5) * 2 * grain * 2
    a += rng.normal(0, 0.6, (h, w))
    # the studio shading of LG's photo: light across the top and middle, falling to about 80% at the foot, a little darker at both edges
    yy = np.linspace(0, 1, h)[:, None]
    xx = np.linspace(-1, 1, w)[None, :]
    shade = 1.02 - 0.22 * np.clip((yy - 0.55) / 0.45, 0, 1) ** 1.5 - 0.05 * np.abs(xx) ** 2
    out = np.stack([(np.full((h, w), base[0]) + a) * shade, (np.full((h, w), base[1]) + a) * shade, (np.full((h, w), base[2]) + a) * shade], axis=2)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def seven(d, x, y, w, h, ch, col, t):
    """One seven-segment digit (or a minus) in a box of w x h, segment thickness t."""
    segs = {"0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g"}[ch]
    hh = h / 2
    P = {"a": (x + t, y, x + w - t, y + t), "g": (x + t, y + hh - t / 2, x + w - t, y + hh + t / 2), "d": (x + t, y + h - t, x + w - t, y + h),
         "f": (x, y + t, x + t, y + hh - t / 2), "b": (x + w - t, y + t, x + w, y + hh - t / 2), "e": (x, y + hh + t / 2, x + t, y + h - t), "c": (x + w - t, y + hh + t / 2, x + w, y + h - t)}
    for k in segs:
        d.rounded_rectangle(P[k], t / 2.5, fill=col)


def main():
    # ── doors, sides: brushed steel, about 0.7 px per mm ──
    # one tall sheet for both doors (1.8 m at 0.7 px per mm), so the shading runs unbroken down the whole front, then cut:
    # the top 525 mm is the freezer door, the bottom 1212 mm the fridge door panel
    tall = steel(490, 1260)
    save(tall.crop((0, 0, 490, 368)), "door_freezer.jpg", 86)
    save(tall.crop((0, 1260 - 848, 490, 1260)), "door_fridge.jpg", 86)
    save(steel(400, 1000, base=(150, 150, 151)), "side.jpg", 86)
    save(steel(400, 1000, base=(150, 150, 151)), "side_l.jpg", 86)

    # ── energy label (LG's own copy shown on this model's photos: 466 L, 261 units/yr, printed model GLT462) ──
    src = Image.open(os.path.join(PHOTOS, "lg_glt4626", "GLT4626TMPZ-2010x1334-2-v.jpg")).convert("RGB")
    sa = np.asarray(src).astype(int)
    ys_, xs_ = np.where((sa.sum(2) < 735) & (np.arange(sa.shape[1])[None, :] < 1040))
    lab = src.crop((xs_.min() + 3, ys_.min() + 3, xs_.max() - 2, ys_.max() - 2))
    from collections import deque
    lab = lab.convert("RGBA")
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

    # ── rear: LG's rear photo as the back panel ──
    rear = Image.open(os.path.join(PHOTOS, "lg_glt4626", "GLT4626TMPZ-DZ-12.jpg")).convert("RGB")
    a = np.asarray(rear).astype(int)
    ys, xs = np.where(a.sum(2) < 735)
    r = rear.crop((xs.min() + 2, ys.min() + 2, xs.max() - 1, ys.max() - 1))
    r = r.resize((r.width * 3 // 4, r.height * 3 // 4), Image.LANCZOS)
    save(r, "rear.jpg", 84)
    print("rear px", r.size)

    # ── "Hygiene Fresh" brushed plate on the fridge back wall (replaces the round control plate of the 343 L) ──
    w, h = 322, 150
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = w / 2, h / 2
    rr = np.hypot((xx - cx) * 0.55, yy - cy)
    v = 178 + 26 * np.cos(rr * 0.55) * np.exp(-rr / 160) + 18 * np.sin(np.arctan2(yy - cy, xx - cx) * 2) + rng.normal(0, 1.4, (h, w))
    im = Image.fromarray(np.stack([v, v, v + 2], axis=2).clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([1, 1, w - 2, h - 2], 6, outline=(120, 122, 126), width=3)
    d.text((cx, cy), "Hygiene Fresh", font=font(int(h * 0.24), 5), fill=(46, 48, 52), anchor="mm")
    save(im, "plate_hygiene.jpg", 90)
    # printed words on the Fresh 0 Zone tray: LG's photo shows "Fresh 0 Zone" over "Fish & Meat"
    img = Image.new("RGBA", (900, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.text((450, 70), "Fresh 0 Zone", font=font(64, 5), fill=(70, 72, 76, 255), anchor="mm")
    d.text((450, 135), "Fish & Meat", font=font(34, 7), fill=(96, 98, 104, 255), anchor="mm")
    save(img, "print_fresh0.png")

    # ── the LED display on the freezer door: 58 x 166 mm, 8 px per mm ──
    # From LG's front photos: a black window with the ThinQ mark at the top, two temperature readouts, small printed
    # lines and a Wi-Fi mark below. The micro-print is not legible in any photo, so it is drawn as faint grey marks,
    # not as words; the readouts show -18 and 3, LG's usual set points (ESTIMATED).
    S = 8
    W_, H_ = 58 * S, 166 * S
    img = Image.new("RGBA", (W_, H_), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, W_ - 1, H_ - 1], 5 * S, fill=(8, 9, 11, 255))
    d.rounded_rectangle([3, 3, W_ - 4, H_ - 4], 5 * S - 3, outline=(40, 42, 46, 255), width=3)
    d.text((W_ / 2, 12 * S), "ThinQ", font=font(int(7.5 * S), 2), fill=(205, 208, 212, 255), anchor="mm")
    on = (236, 240, 244, 255)
    dw, dh, t = int(8 * S), int(14 * S), int(1.9 * S)
    x0 = W_ / 2 - 14 * S
    seven(d, x0, 26 * S, dw, dh, "-", on, t)
    seven(d, x0 + 11 * S, 26 * S, dw, dh, "1", on, t)
    seven(d, x0 + 22 * S, 26 * S, dw, dh, "8", on, t)
    d.ellipse([W_ / 2 + 17 * S, 26 * S, W_ / 2 + 20 * S, 29 * S], outline=on, width=3)
    seven(d, W_ / 2 - 4 * S, 50 * S, dw, dh, "3", on, t)
    d.ellipse([W_ / 2 + 7 * S, 50 * S, W_ / 2 + 10 * S, 53 * S], outline=on, width=3)
    grey = (96, 99, 104, 255)
    for yy_, ww_ in [(80, 24), (84.5, 30), (96, 20), (100.5, 32), (116, 14), (136, 18)]:
        d.rounded_rectangle([W_ / 2 - ww_ / 2 * S * 0.6, yy_ * S, W_ / 2 + ww_ / 2 * S * 0.6, yy_ * S + 1.4 * S], S // 2, fill=grey)
    save(img, "display.png")


main()
