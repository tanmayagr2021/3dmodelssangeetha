"""Samsung RT34HG5A42BXHL rear, compressor bay and side textures, from Samsung's own gallery photos.

usage: python tex_samsung_extra.py <photos dir> <out dir> [--debug <png>]
  photos: samsung/g_550669406.jpg (rear view, 1920x1280, fridge 447 px wide = 630 mm)
  writes <out dir>/samsung/: rear.jpg, bay.jpg, side.jpg, cord_path.json

The rear photo shows the silver dimpled back panel, the condenser cover at the top, the power cord
running down to its plug, and the open compressor bay at the bottom. The cord is modelled in 3D, so it is
painted out of the flat texture along the same centre line the builder uses. Photo scale is 0.71 px per mm
(about 1.4 mm per pixel), so the dimple pattern is soft, but its layout is the real one.
Positions are crop pixels (crop origin 728, 33 in the photo).
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

PHOTOS, OUT = sys.argv[1:3]
DEBUG = sys.argv[4] if len(sys.argv) > 4 and sys.argv[3] == "--debug" else None
ORIGIN = (728, 33)
PPM = 0.7095                                   # photo pixels per mm (447 px = 630 mm wide)
X_C, Y_FLOOR = 231.5, 1205.0                   # centre line of the body and the floor, in crop pixels
CORD = [(112, 310), (113, 400), (115, 550), (117, 700), (121, 850), (132, 915), (160, 955), (215, 975), (290, 985), (350, 985)]
PLUG = (385, 985)
BAY_TOP, BAY_BOTTOM = 1006, 1155               # rows of the bay opening (the bottom edge is the cabinet floor, 70 mm up)
BAY_X = (24, 438)                              # columns of the bay opening


def to_m(x, y):
    """crop pixel -> metres in model coordinates (x seen from the front; the photo is from behind)."""
    return (-(x - X_C) / PPM / 1000, (Y_FLOOR - y) / PPM / 1000)


def main():
    src = Image.open(os.path.join(PHOTOS, "samsung", "g_550669406.jpg")).convert("RGB")
    rear = src.crop((ORIGIN[0], ORIGIN[1], ORIGIN[0] + 463, ORIGIN[1] + 1213))
    a = np.asarray(rear).copy()
    mask = np.zeros(a.shape[:2], np.uint8)
    cv2.polylines(mask, [np.array(CORD, np.int32)], False, 255, 21, cv2.LINE_AA)
    cv2.circle(mask, PLUG, 30, 255, -1)                                    # plug and its strain relief
    cv2.rectangle(mask, (98, 296), (130, 322), 255, -1)                    # the connector where the cord leaves the cover
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8))
    clean = cv2.inpaint(a, mask, 5, cv2.INPAINT_TELEA)
    os.makedirs(os.path.join(OUT, "samsung"), exist_ok=True)

    # upper rear panel: from the top of the cabinet down to the top of the bay opening
    Image.fromarray(clean).crop((8, 8, 455, BAY_TOP)).save(os.path.join(OUT, "samsung", "rear.jpg"), quality=88, optimize=True)
    # the compressor bay, as photographed
    Image.fromarray(a).crop((BAY_X[0], BAY_TOP, BAY_X[1], BAY_BOTTOM)).resize((828, (BAY_BOTTOM - BAY_TOP) * 2), Image.LANCZOS).save(
        os.path.join(OUT, "samsung", "bay.jpg"), quality=88, optimize=True)

    # sides: dark brushed metal; the lightness runs the way it does in the 3/4 photo (lighter at mid-height)
    rng = np.random.default_rng(11)
    h, w = 768, 512
    yy = np.linspace(0, 1, h)[:, None]
    base = 88 + 22 * np.exp(-((yy - 0.45) / 0.3) ** 2) - 6 * yy
    grain = rng.normal(0, 1, (h, w // 8 + 1)).repeat(8, axis=1)[:, :w]
    grain = cv2.GaussianBlur(grain.astype(np.float32), (0, 0), sigmaX=10, sigmaY=0.6) * 3.2
    side = np.stack([base + grain, base + grain + 0.5, base + grain + 3], axis=2).clip(0, 255).astype(np.uint8)
    Image.fromarray(side).save(os.path.join(OUT, "samsung", "side.jpg"), quality=88)

    json.dump({"ppm": PPM, "cord": [to_m(*p) for p in CORD], "plug": to_m(*PLUG), "bay_top": to_m(0, BAY_TOP)[1],
               "bay_bottom": to_m(0, BAY_BOTTOM)[1], "bay_x": [to_m(BAY_X[1], 0)[0], to_m(BAY_X[0], 0)[0]], "cord_d": 0.008},
              open(os.path.join(OUT, "samsung", "cord_path.json"), "w"), indent=1)
    print("wrote rear.jpg, bay.jpg, side.jpg, cord_path.json")

    if DEBUG:
        dbg = rear.copy()
        d = ImageDraw.Draw(dbg)
        d.line(CORD, fill=(255, 0, 0), width=3)
        d.ellipse([PLUG[0] - 30, PLUG[1] - 30, PLUG[0] + 30, PLUG[1] + 30], outline=(0, 255, 0), width=3)
        d.rectangle([BAY_X[0], BAY_TOP, BAY_X[1], BAY_BOTTOM], outline=(255, 0, 255), width=3)
        dbg.save(DEBUG)
        Image.fromarray(clean).save(DEBUG.replace(".png", "_clean.png"))


main()
