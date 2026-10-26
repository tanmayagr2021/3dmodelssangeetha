"""Skin and label textures for the realistic fridge stock (vegetarian food and eggs, juices, water, soft drinks).
Every texture is drawn here from noise and simple shapes, so no photo of a person or a brand is needed.

usage: python tex_food.py <out dir>
Writes into <out dir>/food/.
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(sys.argv[1], "food")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(11)
AV = "/System/Library/Fonts/Avenir Next.ttc"


def save(img, name, q=84):
    p = os.path.join(OUT, name)
    img.convert("RGB").save(p, quality=q, optimize=True)
    print("wrote", p, img.size)


def noise(w, h, scale, seed=0):
    """smooth value noise in 0..1, features about `scale` pixels wide"""
    r = np.random.default_rng(seed)
    gw, gh = max(2, int(w / scale) + 2), max(2, int(h / scale) + 2)
    g = r.random((gh, gw)).astype(np.float32)
    im = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.asarray(im).astype(np.float32) / 255.0


def fbm(w, h, base=64, octaves=4, seed=0):
    a = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        a += amp * noise(w, h, max(2, base / (2 ** o)), seed + o * 7)
        tot += amp
        amp *= 0.5
    return a / tot


def colour(shape, c):
    out = np.zeros(shape + (3,), np.float32)
    out[...] = np.array(c, np.float32)
    return out


def mix(a, b, t):
    return a * (1 - t[..., None]) + b * t[..., None]


def tofile(arr, name, q=84):
    save(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)), name, q)


def skin(name, c0, c1, size=(256, 128), base=40, streak=None, spot=None, seed=1):
    """fruit or vegetable skin: two colours blended by noise, optional vertical streaks and darker spots"""
    w, h = size
    t = fbm(w, h, base, 4, seed)
    if streak:  # long streaks running top to bottom
        s = noise(w, h, 6, seed + 50)
        s = np.asarray(Image.fromarray((s * 255).astype(np.uint8)).resize((w, h)).filter(ImageFilter.GaussianBlur(0.5)), np.float32) / 255
        col = noise(w, 1, 5, seed + 60)
        t = np.clip(t * (1 - streak) + np.repeat(col, h, 0) * streak, 0, 1)
    a = mix(colour((h, w), c0), colour((h, w), c1), t)
    if spot:
        sp = noise(w, h, 2.5, seed + 90)
        a *= (1 - spot * (sp > 0.8)[..., None])
    tofile(a, name)


# ── fruit and vegetable skins (u round the fruit, v from the top to the bottom) ──
skin("tomato.jpg", (176, 26, 20), (222, 58, 36), base=50, seed=1)
skin("apple.jpg", (150, 22, 24), (214, 168, 52), base=36, streak=0.55, seed=2)
skin("orange.jpg", (230, 120, 20), (250, 160, 36), base=30, seed=3)
# the orange's pores: a fine dark speckle on top of the above
im = np.asarray(Image.open(os.path.join(OUT, "orange.jpg"))).astype(np.float32)
sp = noise(256, 128, 1.5, 33)
im *= (1 - 0.18 * (sp > 0.62)[..., None])
tofile(im, "orange.jpg")
skin("lemon.jpg", (232, 204, 40), (246, 226, 90), base=30, seed=4)
im = np.asarray(Image.open(os.path.join(OUT, "lemon.jpg"))).astype(np.float32)
im *= (1 - 0.14 * (noise(256, 128, 1.5, 44) > 0.62)[..., None])
tofile(im, "lemon.jpg")
skin("potato.jpg", (176, 140, 96), (204, 170, 120), base=18, spot=0.45, seed=5)
skin("capsicum_green.jpg", (30, 110, 36), (70, 154, 52), base=50, streak=0.3, seed=6)
skin("capsicum_red.jpg", (170, 20, 22), (220, 48, 32), base=50, streak=0.3, seed=7)
skin("capsicum_yellow.jpg", (226, 170, 24), (250, 212, 60), base=50, streak=0.3, seed=8)
skin("brinjal.jpg", (36, 12, 56), (84, 40, 112), base=70, streak=0.25, seed=9)
skin("chilli.jpg", (30, 100, 28), (74, 150, 46), base=60, streak=0.4, seed=10)
skin("drumstick.jpg", (58, 92, 36), (104, 140, 62), size=(128, 256), base=14, streak=0.7, seed=11)
skin("okra.jpg", (84, 140, 52), (130, 180, 80), size=(128, 128), base=20, streak=0.8, seed=12)
skin("grape.jpg", (110, 170, 70), (170, 205, 110), base=24, seed=13)
skin("coconut_shell.jpg", (86, 54, 30), (128, 90, 54), base=8, streak=0.8, seed=14)
skin("egg.jpg", (196, 146, 98), (226, 186, 140), base=18, spot=0.12, seed=15)

# carrot: orange with fine ring lines along its length (v runs tip to top)
w, h = 128, 256
a = mix(colour((h, w), (226, 108, 20)), colour((h, w), (246, 140, 36)), fbm(w, h, 30, 3, 20))
rings = noise(1, h, 5, 21)
a *= (1 - 0.18 * (rings > 0.7))[:, :, None] if rings.shape[1] == 1 else 1
tofile(a, "carrot.jpg")

# banana: yellow, greener near the stalk, brown speckle and ridge lines (u round, v along)
w, h = 128, 256
a = mix(colour((h, w), (226, 190, 40)), colour((h, w), (244, 214, 70)), fbm(w, h, 40, 3, 22))
green = np.clip((np.linspace(1, 0, h) ** 3)[:, None] * 0.7, 0, 1)
a = mix(a, colour((h, w), (140, 150, 40)), np.repeat(green, w, 1))
sp = noise(w, h, 1.6, 23)
a *= (1 - 0.35 * (sp > 0.8)[..., None])
for ridge in range(0, w, 32):
    a[:, ridge:ridge + 2] *= 0.86
tofile(a, "banana.jpg")

# onion: purple-red papery skin, fine lines from root to tip
w, h = 256, 128
base = mix(colour((h, w), (110, 40, 70)), colour((h, w), (176, 82, 108)), fbm(w, h, 40, 3, 24))
lines = np.repeat(noise(w, 1, 2.4, 25), h, 0)
base *= (0.8 + 0.3 * lines)[..., None]
tofile(base, "onion.jpg")

# cabbage: pale green with curved veins
img = Image.new("RGB", (256, 128), (150, 190, 110))
d = ImageDraw.Draw(img)
for i in range(18):
    x0 = i * 16 + rng.integers(-3, 3)
    d.line([(x0, 0), (x0 + 6, 40), (x0 - 4, 90), (x0 + 3, 128)], fill=(206, 228, 170), width=2)
for i in range(30):
    x = int(rng.integers(0, 256)); y = int(rng.integers(0, 128))
    d.ellipse((x, y, x + 14, y + 8), outline=(122, 168, 88))
img = img.filter(ImageFilter.GaussianBlur(0.8))
a = np.asarray(img).astype(np.float32) * (0.85 + 0.3 * fbm(256, 128, 24, 3, 26))[..., None]
tofile(a, "cabbage.jpg")

# cauliflower: cream, granular
a = mix(colour((128, 256), (226, 218, 188)), colour((128, 256), (248, 242, 220)), fbm(256, 128, 5, 3, 27))
tofile(a, "cauliflower.jpg")

# a leaf (coriander, curry): dark green, a centre vein and side veins; the shape comes from the geometry
img = Image.new("RGB", (128, 256), (44, 118, 40))
d = ImageDraw.Draw(img)
d.line([(64, 0), (64, 256)], fill=(150, 200, 110), width=4)
for i in range(1, 9):
    y = i * 28
    d.line([(64, y), (14, y - 40)], fill=(112, 170, 80), width=2)
    d.line([(64, y), (114, y - 40)], fill=(112, 170, 80), width=2)
a = np.asarray(img).astype(np.float32) * (0.85 + 0.3 * fbm(128, 256, 20, 3, 28))[..., None]
tofile(a, "leaf.jpg")

# watermelon: striped rind, red flesh with seeds
img = Image.new("RGB", (256, 128), (44, 126, 58))
d = ImageDraw.Draw(img)
for i in range(0, 256, 22):
    d.polygon([(i, 0), (i + 8, 0), (i + 14, 128), (i + 4, 128)], fill=(20, 80, 40))
tofile(np.asarray(img).astype(np.float32) * (0.9 + 0.2 * fbm(256, 128, 20, 3, 29))[..., None], "melon_rind.jpg")
img = Image.new("RGB", (256, 256), (222, 52, 68))
d = ImageDraw.Draw(img)
for _ in range(36):
    x, y = int(rng.integers(20, 236)), int(rng.integers(20, 236))
    d.ellipse((x, y, x + 6, y + 10), fill=(24, 20, 20))
tofile(np.asarray(img).astype(np.float32) * (0.92 + 0.16 * fbm(256, 256, 30, 3, 30))[..., None], "melon_flesh.jpg")
img = Image.new("RGB", (256, 256), (250, 248, 242))
tofile(np.asarray(img).astype(np.float32) * (0.97 + 0.06 * fbm(256, 256, 50, 3, 31))[..., None], "coconut_flesh.jpg")


# ── packaging ──
def font(px, face=0):
    return ImageFont.truetype(AV, px, index=face)


def carton(name, bg, fg, word, sub, fruit):
    """a 1 L juice carton face: a band of colour, the fruit drawn simply, the word and '100% fruit juice'"""
    w, h = 256, 512
    img = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, w, 70), fill=fg)
    d.text((w // 2, 36), "JUICE", font=font(34, 8), fill=bg, anchor="mm")
    cx, cy = w // 2, 220
    if fruit == "orange":
        d.ellipse((cx - 78, cy - 78, cx + 78, cy + 78), fill=(244, 140, 20), outline=(190, 90, 10), width=4)
        d.ellipse((cx - 62, cy - 62, cx + 62, cy + 62), outline=(255, 210, 120), width=3)
        d.polygon([(cx, cy - 78), (cx + 30, cy - 98), (cx + 10, cy - 70)], fill=(60, 130, 40))
    elif fruit == "mango":
        d.ellipse((cx - 84, cy - 56, cx + 84, cy + 60), fill=(246, 178, 30), outline=(200, 120, 10), width=4)
        d.ellipse((cx - 40, cy - 40, cx + 10, cy + 6), fill=(255, 216, 100))
        d.polygon([(cx + 40, cy - 52), (cx + 90, cy - 92), (cx + 70, cy - 40)], fill=(60, 130, 40))
    elif fruit == "apple":
        d.ellipse((cx - 74, cy - 70, cx + 74, cy + 78), fill=(190, 34, 36), outline=(130, 20, 24), width=4)
        d.polygon([(cx, cy - 66), (cx + 36, cy - 104), (cx + 12, cy - 60)], fill=(60, 130, 40))
        d.ellipse((cx - 42, cy - 34, cx - 14, cy + 6), fill=(230, 110, 100))
    elif fruit == "pomegranate":
        d.ellipse((cx - 72, cy - 70, cx + 72, cy + 70), fill=(166, 24, 46), outline=(110, 14, 30), width=4)
        d.polygon([(cx - 22, cy - 66), (cx, cy - 92), (cx + 22, cy - 66)], fill=(110, 14, 30))
        for i in range(9):
            d.ellipse((cx - 30 + (i % 3) * 22, cy - 20 + (i // 3) * 22, cx - 16 + (i % 3) * 22, cy - 6 + (i // 3) * 22), fill=(236, 90, 110))
    d.text((w // 2, 360), word, font=font(48 if len(word) <= 7 else 33, 8), fill=fg, anchor="mm")
    d.text((w // 2, 410), sub, font=font(22, 5), fill=fg, anchor="mm")
    d.text((w // 2, 452), "100% fruit juice", font=font(20, 5), fill=fg, anchor="mm")
    d.text((w // 2, 484), "1 L", font=font(22, 0), fill=fg, anchor="mm")
    save(img, name, 86)


carton("carton_orange.jpg", (255, 240, 214), (200, 90, 10), "ORANGE", "no added sugar", "orange")
carton("carton_mango.jpg", (255, 236, 190), (190, 110, 10), "MANGO", "alphonso pulp", "mango")
carton("carton_apple.jpg", (244, 250, 232), (150, 26, 30), "APPLE", "pressed apple", "apple")
carton("carton_pomegranate.jpg", (252, 232, 236), (130, 16, 40), "POMEGRANATE", "rich in antioxidants", "pomegranate")

# drinking-water label (a wrap for a PET bottle: u round, v up)
img = Image.new("RGB", (512, 160), (236, 246, 252))
d = ImageDraw.Draw(img)
d.rectangle((0, 0, 512, 34), fill=(20, 92, 168))
d.rectangle((0, 126, 512, 160), fill=(20, 92, 168))
for k in range(3):
    d.arc((-40 + k * 120, 52, 120 + k * 120, 112), 200, 340, fill=(60, 150, 214), width=4)
d.text((256, 86), "DRINKING WATER", font=font(32, 8), fill=(14, 70, 140), anchor="mm")
d.text((256, 142), "1 litre", font=font(20, 5), fill=(255, 255, 255), anchor="mm")
save(img, "bottle_water.jpg", 86)

# milk sachet (toned milk, 500 ml): blue and white, a drop, the words
w, h = 512, 384
img = Image.new("RGB", (w, h), (238, 246, 252))
d = ImageDraw.Draw(img)
d.rectangle((0, 0, w, 56), fill=(24, 92, 170))
d.rectangle((0, h - 56, w, h), fill=(24, 92, 170))
d.text((w // 2, 28), "FRESH MILK", font=font(30, 8), fill=(255, 255, 255), anchor="mm")
d.polygon([(110, 230), (150, 130), (190, 230)], fill=(70, 150, 220))
d.ellipse((110, 196, 190, 270), fill=(70, 150, 220))
d.text((w // 2 + 40, 190), "TONED", font=font(54, 8), fill=(20, 80, 150), anchor="lm")
d.text((w // 2 + 40, 250), "MILK", font=font(54, 8), fill=(20, 80, 150), anchor="lm")
d.text((w // 2, h - 28), "500 ml", font=font(28, 5), fill=(255, 255, 255), anchor="mm")
save(img, "sachet_milk.jpg", 86)

# butter-milk / curd sachet
img = Image.new("RGB", (w, h), (250, 244, 230))
d = ImageDraw.Draw(img)
d.rectangle((0, 0, w, 56), fill=(214, 150, 30))
d.rectangle((0, h - 56, w, h), fill=(214, 150, 30))
d.text((w // 2, 28), "BUTTERMILK", font=font(30, 8), fill=(255, 255, 255), anchor="mm")
d.text((w // 2, 190), "SPICED", font=font(60, 8), fill=(150, 90, 10), anchor="mm")
d.text((w // 2, 256), "with curry leaf", font=font(30, 5), fill=(150, 90, 10), anchor="mm")
d.text((w // 2, h - 28), "200 ml", font=font(28, 5), fill=(255, 255, 255), anchor="mm")
save(img, "sachet_buttermilk.jpg", 86)
