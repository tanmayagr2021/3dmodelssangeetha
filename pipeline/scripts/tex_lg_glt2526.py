"""Textures for the LG GLT2526XWPZ double-door refrigerator (Shiny Steel, 251 L).

usage: python tex_lg_glt2526.py <photos dir> <logos dir> <out dir>
  photos: lg_glt2526/2010x1334-2-v.jpg (the energy label), lg_glt2526/DZ-12.jpg (rear), DZ-04.jpg (side)
  logos:  lg.png
  writes <out dir>/lg_glt2526/*.jpg|png

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
D = os.path.join(OUT, "lg_glt2526")
os.makedirs(D, exist_ok=True)
rng = np.random.default_rng(26)
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


def main():
    # ── doors: 1.5 px per mm ──
    save(steel(416, 361), "door_freezer.jpg", 86)
    save(steel(416, 764), "door_fridge.jpg", 86)
    side = steel(320, 790, base=(150, 150, 151))
    # four angled louvres low on the right-hand side face (positions read off the 3/4 photo)
    d = ImageDraw.Draw(side)
    for i in range(4):
        y = 598 + i * 24
        d.polygon([(159, y + 17), (212, y), (215, y + 6), (162, y + 23)], fill=(92, 93, 95))
        d.polygon([(159, y + 17), (212, y), (213, y + 2), (160, y + 19)], fill=(205, 206, 207))
    save(side, "side.jpg", 86)
    save(steel(320, 790, base=(150, 150, 151)), "side_l.jpg", 86)

    # ── energy label (LG's copy for GLT252, 251 L, 233 units/yr) ──
    src = Image.open(os.path.join(PHOTOS, "lg_glt2526", "2010x1334-2-v.jpg")).convert("RGB")
    lab = src.crop((459 + 6, 238 + 6, 938 - 4, 1116 - 4))
    # round the pink halo off: keep the die-cut shape, white outside
    # die-cut: everything light that touches the border (white and the pink halo) is transparent
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
        if min(r, g, bl) < 205 and not (r > 235 and g < 215):           # a darker colour (not the pink halo) ends the fill
            continue
        seen[y, x] = True
        px[x, y] = (r, g, bl, 0)
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    alpha = lab.getchannel("A")
    lab = lab.convert("RGB").quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA")   # flat printed colours: 64 are enough
    lab.putalpha(alpha)
    save(lab, "label.png")

    # ── LG mark: grey disc and wordmark as printed on the freezer door (dark on steel) ──
    lg = Image.open(os.path.join(LOGOS, "lg.png")).convert("RGBA")
    a = np.asarray(lg).astype(float)
    mark = np.zeros(a.shape, np.uint8)
    lum = a[..., :3].mean(axis=2)
    mark[..., :3] = (84, 86, 90)
    mark[..., 3] = (a[..., 3] * 0.95).clip(0, 255).astype(np.uint8)
    save(Image.fromarray(mark), "lgmark.png")

    # ── rear: LG's rear photo as the back panel ──
    rear = Image.open(os.path.join(PHOTOS, "lg_glt2526", "DZ-12.jpg")).convert("RGB")
    a = np.asarray(rear).astype(int)
    ys, xs = np.where(a.sum(2) < 735)
    r = rear.crop((xs.min() + 2, ys.min() + 2, xs.max() - 1, ys.max() - 1))
    r = r.resize((r.width * 3 // 4, r.height * 3 // 4), Image.LANCZOS)
    save(r, "rear.jpg", 84)
    print("rear px", r.size)

    # ── interior prints ──
    # "Convertible" and the temperature dial scale (Min ... Max), printed on the freezer's back wall
    img = Image.new("RGBA", (520, 190), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.text((170, 52), "Convertible", font=font(52, 7), fill=(60, 62, 66, 255), anchor="lm")
    d.text((22, 160), "Min", font=font(30), fill=(70, 72, 76, 255), anchor="lm")
    d.text((470, 160), "Max", font=font(30), fill=(70, 72, 76, 255), anchor="rm")
    for i in range(7):
        ang = np.radians(205 - i * 25)
        cx, cy = 165, 148
        x0, y0 = cx + 62 * np.cos(ang), cy - 62 * np.sin(ang)
        x1, y1 = cx + 74 * np.cos(ang), cy - 74 * np.sin(ang)
        d.line([(x0, y0), (x1, y1)], fill=(90, 92, 96, 255), width=3)
    save(img, "print_convertible.png")
    # the knob top
    k = Image.new("RGB", (256, 256), (235, 236, 238))
    d = ImageDraw.Draw(k)
    d.ellipse([8, 8, 248, 248], outline=(170, 172, 176), width=10)
    d.line([(128, 128), (128, 26)], fill=(60, 62, 66), width=14)
    save(k, "knob.jpg")
    # "Fresh Zone" on the white front of the vegetable drawer
    img = Image.new("RGB", (900, 220), (247, 248, 250))
    d = ImageDraw.Draw(img)
    d.text((450, 110), "Fresh Zone", font=font(50, 5), fill=(96, 99, 106), anchor="mm")
    save(img, "fresh_zone.jpg")
    # the egg-basket's six cups are geometry; the cold-air louvre strip is a texture
    # ── labels for the stocked food: plain words ──
    def label(name, lines, bg, fg, size=(512, 256), icon=None):
        im = Image.new("RGB", size, bg)
        d = ImageDraw.Draw(im)
        y = size[1] // (len(lines) + 1)
        for i, (txt, px, face) in enumerate(lines):
            d.text((size[0] // 2, y * (i + 1)), txt, font=font(px, face), fill=fg, anchor="mm")
        save(im, name, 90)
    label("lbl_curd.jpg", [("CURD", 120, 0), ("fresh set curd", 48, 7)], (240, 244, 250), (28, 78, 150))
    label("lbl_batter.jpg", [("IDLI", 120, 0), ("DOSA BATTER", 60, 0)], (255, 245, 214), (150, 60, 20))
    label("lbl_ghee.jpg", [("GHEE", 130, 0), ("pure cow ghee", 48, 7)], (255, 236, 160), (110, 60, 10))
    label("lbl_coffee.jpg", [("FILTER", 100, 0), ("COFFEE", 100, 0), ("decoction", 44, 7)], (62, 36, 22), (245, 220, 180), (512, 320))
    label("lbl_pickle.jpg", [("PICKLE", 120, 0), ("mango", 52, 7)], (196, 52, 40), (255, 240, 220))
    label("lbl_milk.jpg", [("MILK", 150, 0), ("toned  500 ml", 50, 7)], (232, 242, 252), (30, 80, 160), (512, 320))
    label("lbl_butter.jpg", [("BUTTER", 90, 0), ("salted", 44, 7)], (255, 218, 80), (140, 30, 20), (400, 200))
    label("lbl_paneer.jpg", [("PANEER", 96, 0)], (250, 250, 244), (70, 110, 70), (400, 200))
    label("lbl_icecream.jpg", [("ICE CREAM", 90, 0), ("chocolate", 48, 7)], (120, 62, 36), (255, 238, 214), (512, 256))
    label("lbl_icecream2.jpg", [("ICE CREAM", 90, 0), ("vanilla", 48, 7)], (246, 232, 190), (170, 40, 36), (512, 256))
    label("lbl_peas.jpg", [("GREEN PEAS", 84, 0), ("frozen", 44, 7)], (58, 150, 70), (255, 255, 255), (400, 300))
    label("lbl_parotta.jpg", [("PAROTTA", 92, 0), ("frozen", 44, 7)], (232, 160, 70), (90, 36, 10), (400, 300))
    label("lbl_sambar.jpg", [("SAMBAR", 100, 0)], (214, 214, 218), (60, 60, 64), (400, 200))
    # coconut and watermelon skins, vegetables: plain colours in the builder


main()
