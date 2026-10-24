"""LG FHP1412Z9B control strip and dial-top textures, redrawn crisp from LG's front photo.

usage: python tex_lg_panel.py <photos dir> <out dir> [--compare <png>]
  photos: lg/lg_g1.jpg (LG gallery front view, 2010x1334, body 705 px wide = 600 mm)
  writes: <out dir>/lg/panel.jpg   the strip right of the detergent drawer, 4 px per mm
          <out dir>/lg/knob_top.jpg   brushed-aluminium top of the rotary selector

The photo only has about 1.18 px per mm, so enlarging it just blurs the dial and the programme
names. Everything legible in the photo is retypeset at 4 px per mm instead: the programme names,
leader lines, dial surround, the two round buttons and the display numbers. The positions are read
off the photo (source pixels below). The wording and artwork that is too small to read in the photo
(the display icons, the five key labels with their sub-labels, "*Beep On/Off", "*Child Lock" and the
extra-function note) come from the control-panel diagram in LG's own owner's manual for this model
(MFL72036403, page 21), saved as small alpha images in pipeline/sources/lg-panel/. The warranty
badge is still cropped from the photo.
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

PHOTOS, OUT = sys.argv[1:3]
HERE = os.path.dirname(os.path.abspath(__file__))
COMPARE = sys.argv[4] if len(sys.argv) > 4 and sys.argv[3] == "--compare" else None

PPM = 1.176            # photo pixels per mm (body 705 px = 600 mm wide; 1001 px = 850 mm tall)
T = 4                  # texture pixels per mm
SS = 2                 # supersampling for smooth edges
X0, Y0 = 888.0, 168.0  # photo pixel at the strip's top-left (x = -90 mm, y = 850 mm in the model)
W_MM, H_MM = 390, 105
K = T / PPM * SS       # photo pixels -> supersampled texture pixels

FONT = "/System/Library/Fonts/Avenir Next.ttc"


def font(size_src, weight=7):
    f = ImageFont.truetype(FONT, max(4, round(size_src * K)), index=weight)
    return f


def P(x, y):
    return ((x - X0) * K, (y - Y0) * K)


def main():
    src = Image.open(os.path.join(PHOTOS, "lg", "lg_g1.jpg")).convert("RGB")
    w, h = W_MM * T * SS, H_MM * T * SS
    # panel metal: a soft vertical gradient taken from the photo (lighter top edge, darker toward the door)
    yy = np.linspace(0, 1, h)[:, None]
    base = np.stack([76 - 14 * yy, 76 - 15 * yy, 78 - 14 * yy], axis=2) * np.ones((1, w, 1))
    rng = np.random.default_rng(3)
    base += rng.normal(0, 1.1, (h, w, 1))
    img = Image.fromarray(base.clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img)

    def crop_paste(box, to, base_fill=None):
        """Adds only what is brighter or darker than the crop's own background (its median), so the
        photo's patch colour does not show; the detail lands on the redrawn surface."""
        c = src.crop(box)
        c = c.resize((round(c.width * K), round(c.height * K)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 90, 2))
        ca = np.asarray(c).astype(float)
        delta = ca - np.median(ca.reshape(-1, 3), axis=0)
        mag = np.abs(delta).max(axis=2, keepdims=True)
        delta = delta * np.clip((mag - 10) / 25, 0, 1)             # keep strokes, drop the patch tone and JPEG haze
        x, y = round(P(*to)[0]), round(P(*to)[1])
        if base_fill:
            d.rectangle([x, y, x + c.width, y + c.height], fill=base_fill)
        region = np.asarray(img.crop((x, y, x + c.width, y + c.height))).astype(float)
        img.paste(Image.fromarray((region + delta).clip(0, 255).astype(np.uint8)), (x, y))

    # ── display glass: photo first (icons), then numbers and grids redrawn over it ──
    crop_paste((1125, 181, 1306, 262), (1125, 181), base_fill=(27, 25, 26))
    glass = (27, 25, 26)
    d.rectangle([*P(1127, 183), *P(1213, 241)], fill=glass)          # icons and clock digits (both redrawn)
    d.rectangle([*P(1215, 188), *P(1306, 241)], fill=glass)          # temp / spin grid and captions

    # 7-segment digits: unlit ghost "88" and the lit "39"
    def seg(cx, cy, hgt, wid, on, col):
        t = hgt * 0.13
        hw, hh = wid / 2, hgt / 2
        segs = {"a": (-hw, -hh, hw, -hh + t), "g": (-hw, -t / 2, hw, t / 2), "d": (-hw, hh - t, hw, hh),
                "f": (-hw, -hh, -hw + t, 0), "b": (hw - t, -hh, hw, 0), "e": (-hw, 0, -hw + t, hh), "c": (hw - t, 0, hw, hh)}
        for k, (x1, y1, x2, y2) in segs.items():
            lit = k in on
            d.rectangle([*P(cx + x1, cy + y1), *P(cx + x2, cy + y2)], fill=col if lit else (58, 56, 57))

    DIG = {"3": "abgcd", "9": "abfgcd"}
    for cx in (1149.5, 1162):                                        # unlit "88" ghost
        seg(cx, 211.7, 21.5, 11, "", None)
    for yy_ in (206.5, 215):
        d.ellipse([*P(1167.4, yy_), *P(1169, yy_ + 1.6)], fill=(58, 56, 57))
    for cx, ch in ((1176.5, "3"), (1190.5, "9")):                    # the lit "39"
        seg(cx, 211.7, 21.5, 11.5, "abcdefg", (58, 56, 57))
        seg(cx, 211.7, 21.5, 11.5, DIG[ch], (246, 246, 250))

    gf, gfb = font(5.6, 7), font(5.6, 5)
    dim, lit = (96, 94, 97), (250, 250, 252)
    for (x, y, s, on) in [(1227, 196, "Cold", 0), (1244.5, 196, "20°C", 0), (1264, 196, "30°C", 0),
                          (1227, 207.5, "40°C", 1), (1244.5, 207.5, "60°C", 0), (1264, 207.5, "95°C", 0),
                          (1230, 224, "No", 0), (1246, 224, "400", 0), (1264, 224, "800", 0),
                          (1227.5, 235, "1000", 0), (1245.5, 235, "1200", 1), (1264, 235, "1400", 0)]:
        d.text(P(x, y), s, font=gfb if on else gf, fill=lit if on else dim, anchor="mm")
    cap = font(6.3, 5)
    d.text(P(1288, 200.7), "Temp.", font=cap, fill=(200, 200, 205), anchor="mm")
    d.text(P(1288, 227.5), "Spin", font=cap, fill=(200, 200, 205), anchor="mm")
    d.line([P(1279, 189), P(1279, 240)], fill=(52, 50, 52), width=SS)
    d.line([P(1215, 214.5), P(1304, 214.5)], fill=(52, 50, 52), width=SS)
    # display frame
    d.rectangle([*P(1125, 181), *P(1306, 260)], outline=(20, 19, 20), width=2 * SS)

    # the five touch keys with their sub-labels, from the manual's diagram
    d.rectangle([*P(1127, 242), *P(1305, 259)], fill=(66, 65, 70))
    d.rectangle([*P(1127, 242), *P(1305, 259)], outline=(40, 39, 42), width=SS)
    def overlay(name, box, colour, alpha_scale=1.0, x_range=None):
        im = Image.open(os.path.join(HERE, "..", "sources", "lg-panel", name + ".png"))
        a = np.asarray(im)[..., 3].astype(float) * alpha_scale
        w_, h_ = round((box[2] - box[0]) * K), round((box[3] - box[1]) * K)
        a = np.asarray(Image.fromarray(a.astype(np.uint8)).resize((w_, h_), Image.LANCZOS)).astype(float) / 255
        if x_range:
            a[:, : round(x_range[0] * w_)] *= 0.0 if x_range[0] else 1
        x, y = round(P(box[0], box[1])[0]), round(P(box[0], box[1])[1])
        region = np.asarray(img.crop((x, y, x + w_, y + h_))).astype(float)
        col = np.array(colour, float)
        img.paste(Image.fromarray((region * (1 - a[..., None]) + col * a[..., None]).clip(0, 255).astype(np.uint8)), (x, y))
    overlay("keys_text", (1129, 242.3, 1303.5, 257.3), (228, 228, 234))
    overlay("bracket_text", (1178, 259.5, 1291, 266.2), (170, 170, 178))
    d.text(P(1304.7, 177.2), "*Extra Function : Hold 3 seconds", font=font(3.6, 7), fill=(170, 170, 178), anchor="rm")   # wording from the manual
    # display icons: the AI mark is unlit, the other three on top are lit; the bottom row is unlit
    overlay("icons_top", (1135, 187.5, 1205, 196.5), (92, 92, 98))
    top = Image.open(os.path.join(HERE, "..", "sources", "lg-panel", "icons_top.png"))
    overlay("icons_top", (1135, 187.5, 1205, 196.5), (246, 246, 250), x_range=(0.26, 1))
    overlay("icons_bottom", (1135, 222.5, 1205, 231.5), (92, 92, 98))
    crop_paste((1255, 267, 1306, 287), (1255, 267))                  # DIRECT DRIVE MOTOR / 10 years badge

    # ── dial surround ──
    cx, cy = 1002.3, 224.5          # centre of the surround on the panel; the raised knob top reads a little up-left in the photo
    def circ(r, fill=None, outline=None, wd=1):
        d.ellipse([*P(cx - r, cy - r), *P(cx + r, cy + r)], fill=fill, outline=outline, width=max(1, round(wd * K)))
    circ(37.4, fill=(34, 34, 37), outline=(168, 168, 174), wd=0.55)
    circ(34.6, outline=(22, 22, 24), wd=1.0)
    circ(32.0, fill=(18, 18, 20))

    # programme names and the lines running into the dial
    lab = font(6.1, 7)
    red = (208, 74, 116)
    d.rectangle([*P(904.3, 170), *P(905.6, 247)], fill=(150, 60, 92))
    left = [("STEAM CYCLE", 172.5, True), ("Cotton", 180.5, False), ("Cotton+", 190.5, False), ("TurboWash 39", 200.5, False),
            ("Mixed Fabric", 210.5, False), ("Easy Care", 221, False), ("Silent Wash", 231.5, False), ("Allergy Care", 242, True)]
    right = [("Delicates", 179.5), ("Hand/Wool", 189.5), ("Sportswear", 199), ("Speed 14", 208.5), ("Duvet", 218.5), ("Tub Clean", 230), ("Download Cycle", 241)]
    line = (150, 150, 156)
    for s, y, r in left:
        f = font(5.0, 2) if s == "STEAM CYCLE" else lab
        d.text(P(909, y), s, font=f, fill=red if r else (222, 222, 228), anchor="lm")
        if s == "STEAM CYCLE":
            continue
        x_end = 909 + d.textlength(s, font=lab) / K + 3
        half = math.sqrt(max(0, 39.5 ** 2 - (y - cy) ** 2))
        if cx - half > x_end:
            d.line([P(x_end, y), P(cx - half, y)], fill=line, width=max(1, round(0.5 * K)))
    for s, y in right:
        d.text(P(1088, y), s, font=lab, fill=(222, 222, 228), anchor="rm")
        x_start = 1088 - d.textlength(s, font=lab) / K - 3
        half = math.sqrt(max(0, 39.5 ** 2 - (y - cy) ** 2))
        if cx + half < x_start:
            d.line([P(cx + half, y), P(x_start, y)], fill=line, width=max(1, round(0.5 * K)))

    crop_paste((893, 257, 914, 282), (893, 257))                      # Smart Diagnosis mark, left of the power button
    # round buttons: power (left) and start/pause (right)
    for bx, by, power in ((928.7, 265, True), (1070, 264, False)):
        r = 12.5
        d.ellipse([*P(bx - r, by - r), *P(bx + r, by + r)], fill=(40, 40, 43), outline=(170, 170, 176), width=round(0.6 * K))
        d.ellipse([*P(bx - r + 2.2, by - r + 2.2), *P(bx + r - 2.2, by + r - 2.2)], outline=(24, 24, 26), width=round(0.8 * K))
        if power:
            d.arc([*P(bx - 5.2, by - 5), *P(bx + 5.2, by + 5.4)], 300, 240, fill=(240, 240, 244), width=round(1.0 * K))
            d.line([P(bx, by - 6.5), P(bx, by - 0.5)], fill=(240, 240, 244), width=round(1.0 * K))
        else:
            d.polygon([P(bx - 4.6, by - 4.6), P(bx - 4.6, by + 4.6), P(bx + 0.8, by)], fill=(70, 70, 74))
            d.rectangle([*P(bx + 2.4, by - 4.6), *P(bx + 4.2, by + 4.6)], fill=(70, 70, 74))

    # right-hand rim: the strip meets the rounded body edge (photo x 1306..1347)
    for i in range(round(41 * K)):                                    # rounded body edge: a soft highlight
        t = i / (41 * K)
        v = 72 + 80 * max(0, (t - 0.72) / 0.28) ** 2
        d.line([(P(1306, 0)[0] + i, 0), (P(1306, 0)[0] + i, h)], fill=(round(v), round(v), round(v + 2)))

    out = img.resize((W_MM * T, H_MM * T), Image.LANCZOS)
    os.makedirs(os.path.join(OUT, "lg"), exist_ok=True)
    out.save(os.path.join(OUT, "lg", "panel.jpg"), quality=92, optimize=True)
    print("wrote", os.path.join(OUT, "lg", "panel.jpg"), out.size)

    # ── knob top: brushed aluminium with the four-lobed highlight of the real dial ──
    n = 512
    yy, xx = np.mgrid[0:n, 0:n]
    dx, dy = (xx - n / 2 + 0.5) / (n / 2), (yy - n / 2 + 0.5) / (n / 2)
    r = np.hypot(dx, dy)
    a = np.arctan2(dy, dx)
    # conical facets: bright where the facet normal faces the light, giving the X seen in the photos
    cone = 0.5 + 0.5 * np.cos(2 * a - math.radians(90) * 0 + 0.0)
    lobes = np.abs(np.cos(2 * a))                       # four bright wedges
    shade = 205 + 40 * lobes ** 2 - 55 * (1 - lobes ** 2) * r
    rng = np.random.default_rng(5)
    ring_noise = rng.normal(0, 1, (n, 1)) * 0 + np.cos(r * 220) * 2.0          # concentric machining rings
    shade += ring_noise + rng.normal(0, 1.4, (n, n))
    shade -= 22 * np.clip((r - 0.86) / 0.14, 0, 1)      # darker rim
    kn = np.stack([shade, shade, shade + 3], axis=2).clip(0, 255).astype(np.uint8)
    Image.fromarray(kn).save(os.path.join(OUT, "lg", "knob_top.jpg"), quality=92)
    print("wrote knob_top.jpg")

    # ── round button caps: dark face with the symbol, for the raised 3D buttons ──
    for name, power in (("btn_power", True), ("btn_play", False)):
        n = 256
        im = Image.new("RGB", (n, n), (38, 38, 42))
        bd = ImageDraw.Draw(im)
        for r in range(n // 2, 0, -2):
            v = 30 + int(14 * (1 - r / (n / 2)))
            bd.ellipse([n / 2 - r, n / 2 - r, n / 2 + r, n / 2 + r], fill=(v, v, v + 3))
        if power:
            bd.arc([n * 0.28, n * 0.3, n * 0.72, n * 0.74], 300, 240, fill=(240, 240, 244), width=n // 16)
            bd.line([(n / 2, n * 0.2), (n / 2, n * 0.5)], fill=(240, 240, 244), width=n // 16)
        else:
            bd.polygon([(n * 0.32, n * 0.3), (n * 0.32, n * 0.7), (n * 0.56, n * 0.5)], fill=(150, 150, 156))
            bd.rectangle([n * 0.62, n * 0.3, n * 0.69, n * 0.7], fill=(150, 150, 156))
        im.save(os.path.join(OUT, "lg", name + ".jpg"), quality=92)
    print("wrote button caps")

    if COMPARE:
        ref = src.crop((888, 168, 1347, 292))
        ref = ref.resize((round(ref.width * 3.4), round(ref.height * 3.4)), Image.LANCZOS)
        new = out.resize(ref.size, Image.LANCZOS)
        both = Image.new("RGB", (ref.width, ref.height * 2 + 6), "white")
        both.paste(ref, (0, 0)); both.paste(new, (0, ref.height + 6))
        both.save(COMPARE)


main()
