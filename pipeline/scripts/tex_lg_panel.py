"""LG FHP1412Z9B control strip, detergent-drawer face, knob top and button caps, from a straight-on photo
of LG's own control panel.

usage: python tex_lg_panel.py <photos dir> <out dir> [--compare <png>]
  photos: lg/panel_front.jpg  2172 x 724, the whole front strip seen from the front: the body is 2166 px
          wide for 600 mm (3.61 px/mm), the strip is 105 mm tall (850 mm down to 745 mm).
  writes <out dir>/lg/: panel.jpg (strip right of the drawer, 390 x 105 mm), drawer.jpg (the drawer face,
         about 210 x 105 mm), knob_top.jpg (the photographed brushed-metal knob top),
         btn_power.jpg and btn_play.jpg (button caps for the raised 3D buttons)

The photo's own "*Extra Function : Hold 3 seconds" note is missing its middle ("*Extra Fu ... : Hold"), so
that label is repainted with the wording from LG's owner's manual (MFL72036403, page 21). The 3D knob and
buttons stand over the photographed ones; the photographed knob is painted out of the strip so it does not show
twice. Everything else is the photo as it is.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

PHOTOS, OUT = sys.argv[1:3]
COMPARE = sys.argv[4] if len(sys.argv) > 4 and sys.argv[3] == "--compare" else None

TOP, BOTTOM = 150, 528            # strip rows in the photo: top of the unit, bottom of the strip
DRAWER_X0, DRAWER_X1 = 4, 762     # photo columns: left body edge, drawer face / panel split (x = -90 mm)
RIGHT = 2170                      # right body edge
FONT = "/System/Library/Fonts/Avenir Next.ttc"
KNOB_C, KNOB_R = (1107.5, 375), (106.5, 101)       # photographed knob top: centre and radii (it sits 14 px low in the photo)


def main():
    src = Image.open(os.path.join(PHOTOS, "lg", "panel_front.jpg")).convert("RGB")
    a = np.asarray(src).copy().astype(np.float32)

    # ── repaint the label whose middle is missing ──
    box = (1896, 205, 2090, 232)
    ref = a[box[1] - 12:box[1] - 2, box[0]:box[2]].reshape(-1, 3).mean(axis=0)
    a[box[1]:box[3], box[0]:box[2]] = ref
    patched = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(patched)
    f = ImageFont.truetype(FONT, 11, index=7)
    d.text((2077, 218), "*Extra Function : Hold 3 seconds", font=f, fill=(222, 222, 226), anchor="rm")

    # ── paint the photographed knob out of the strip (the 3D knob stands there) ──
    a = np.asarray(patched).copy().astype(np.float32)
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    inside = ((xx - KNOB_C[0]) / (KNOB_R[0] + 7)) ** 2 + ((yy - KNOB_C[1]) / (KNOB_R[1] + 7)) ** 2 < 1
    a[inside] = np.array([14.0, 14.0, 16.0])
    cleaned = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    mask = Image.fromarray((inside * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
    clean = Image.composite(cleaned, patched, mask)

    os.makedirs(os.path.join(OUT, "lg"), exist_ok=True)
    panel = clean.crop((DRAWER_X1, TOP, RIGHT, BOTTOM))
    panel.save(os.path.join(OUT, "lg", "panel.jpg"), quality=92, optimize=True)
    drawer = clean.crop((DRAWER_X0, TOP, DRAWER_X1, BOTTOM))
    drawer.save(os.path.join(OUT, "lg", "drawer.jpg"), quality=92, optimize=True)
    print("wrote panel.jpg", panel.size, "drawer.jpg", drawer.size)

    # ── knob top: the photographed disc, brushed metal with its highlights ──
    kb = (round(KNOB_C[0] - KNOB_R[0]), round(KNOB_C[1] - KNOB_R[1]), round(KNOB_C[0] + KNOB_R[0]), round(KNOB_C[1] + KNOB_R[1]))
    src.crop(kb).resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, "lg", "knob_top.jpg"), quality=92)
    print("wrote knob_top.jpg")

    # ── round button caps (symbol on a dark face) for the raised 3D buttons ──
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
    print("wrote button caps")

    if COMPARE:
        both = Image.new("RGB", (panel.width, panel.height * 2 + 6), "white")
        both.paste(src.crop((DRAWER_X1, TOP, RIGHT, BOTTOM)), (0, 0))
        both.paste(panel, (0, panel.height + 6))
        both.save(COMPARE)


main()
