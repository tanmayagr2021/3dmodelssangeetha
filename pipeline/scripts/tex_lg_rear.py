"""LG FHP1412Z9B rear and side textures, and the hose/cord paths, from LG's own gallery photos.

usage: python tex_lg_rear.py <photos dir> <out dir> [--debug <png>]
  photos: lg/lg_dz12.jpg (rear view), lg/lg_dz10.jpg and lg/lg_dz11.jpg (left and right side views)
  writes <out dir>/lg/: rear.jpg, tubplate.jpg, side_l.jpg, side_r.jpg, hose.jpg, rear_paths.json

The rear photo shows the drain hose, the power cord and the plug lying over the back. Those are
modelled in 3D, so the flat texture has them painted out (inpainted along the same centre lines the
builder uses) and only the cabinet, tub plate, transit bolts and fittings stay in the picture.
Positions below are photo pixels read off the photo (1.38 px per mm: body 835 px = 600 mm wide).
Hose, cord and plug sizes are estimated from the photo; LG publishes none of them.
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

PHOTOS, OUT = sys.argv[1:3]
DEBUG = sys.argv[4] if len(sys.argv) > 4 and sys.argv[3] == "--debug" else None
PPM = 1.38
CX, YB = 1008.0, 1251.0          # photo pixel of the body's centre line and of the floor under the feet

# centre lines, photo pixels (x, y); the photo is the view from behind
HOSE = [(668, 1048), (650, 1000), (636, 930), (625, 860), (619, 780), (618, 700), (623, 610), (636, 520), (655, 440),
        (683, 365), (722, 307), (775, 252), (840, 227), (920, 214), (1000, 211), (1100, 212), (1200, 217), (1265, 228),
        (1325, 252), (1370, 305), (1393, 360), (1400, 440), (1402, 540), (1402, 640), (1400, 740), (1394, 830),
        (1388, 900), (1386, 925)]
CORD = [(651, 207), (672, 222), (705, 240), (745, 250), (790, 250), (850, 240), (915, 228), (965, 222), (983, 222)]
LOOP = [(979, 229), (919, 259), (869, 299), (851, 344), (861, 404), (899, 459), (949, 489), (989, 484), (1029, 454),
        (1059, 404), (1069, 344), (1054, 284), (1019, 244), (984, 226)]
DROP = [(1004, 234), (1049, 254), (1089, 284), (1119, 324), (1144, 374), (1164, 434), (1177, 494), (1189, 554),
        (1196, 634), (1198, 674), (1209, 729), (1239, 794), (1279, 829), (1309, 849), (1339, 904), (1351, 944),
        (1354, 994), (1339, 1044), (1324, 1084), (1322, 1112)]
PLUG = (1322, 1154)              # plug body centre
PLATE = (749, 354, 1259, 1084)   # raised steel tub plate: x0, y0, x1, y1
BOLTS = [(774, 329), (1232, 329), (678, 832), (1329, 830)]
HOSE_D, CORD_D = 0.020, 0.008    # metres, estimated from the photo


def to_m(x, y):
    """photo pixel -> (x, y) in metres, model coordinates seen from the front (the photo is from behind)."""
    return (-(x - CX) / PPM / 1000, (YB - y) / PPM / 1000)


def main():
    rear = Image.open(os.path.join(PHOTOS, "lg", "lg_dz12.jpg")).convert("RGB")
    a = np.asarray(rear).copy()
    mask = np.zeros(a.shape[:2], np.uint8)

    def stroke(pts, width):
        cv2.polylines(mask, [np.array(pts, np.int32)], False, 255, int(width), cv2.LINE_AA)

    stroke(HOSE, 36)
    stroke(CORD, 17)
    stroke(LOOP, 17)
    stroke(DROP, 17)
    cv2.circle(mask, (int(PLUG[0]), int(PLUG[1])), 52, 255, -1)
    cv2.rectangle(mask, (1440 - 130, 905), (1440 - 20, 945), 255, -1)       # green tag on the cord
    cv2.rectangle(mask, (1370, 880), (1425, 945), 255, -1)                   # hose end connector and clip (rebuilt in 3D)
    cv2.circle(mask, (1314, 856), 16, 255, -1)                               # cord clip at the bolt
    cv2.rectangle(mask, (640, 920), (700, 980), 255, -1)                     # hose clamp at the left
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8))
    clean = cv2.inpaint(a, mask, 6, cv2.INPAINT_TELEA)
    # transit bolts are in the photo, keep them (inpaint only touched the mask)

    # rear plane: the body's back, x +-300 mm, from the feet (14 mm) to the top plate (850 mm)
    x0, x1 = round(CX - 0.3 * 1000 * PPM), round(CX + 0.3 * 1000 * PPM)
    y0, y1 = round(YB - 0.850 * 1000 * PPM + 11), round(YB - 0.014 * 1000 * PPM)
    Image.fromarray(clean).crop((x0, y0, x1, y1)).resize((640, round(640 * (y1 - y0) / (x1 - x0))), Image.LANCZOS).save(os.path.join(OUT, "lg", "rear.jpg"), quality=84, optimize=True)
    px0, py0, px1, py1 = PLATE
    Image.fromarray(clean).crop((px0, py0, px1, py1)).resize((420, round(420 * (py1 - py0) / (px1 - px0))), Image.LANCZOS).save(os.path.join(OUT, "lg", "tubplate.jpg"), quality=86, optimize=True)
    print("rear crop", (x0, y0, x1, y1), "->", (x1 - x0, y1 - y0))

    # sides: dz10 is the left side seen from outside (front at the right of the photo), dz11 the right side.
    # Crops run from the rear edge to the front face and from the top plate to the feet, so the
    # embossed vertical panels land where they are on the real cabinet.
    for name, f, box in (("side_l", "lg_dz10.jpg", (658, 88, 1402, 1213)), ("side_r", "lg_dz11.jpg", (616, 85, 1352, 1218))):
        im = Image.open(os.path.join(PHOTOS, "lg", f)).convert("RGB").crop(box)
        im = im.resize((512, round(512 * im.height / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, "lg", name + ".jpg"), quality=84, optimize=True)
        print("wrote", name, im.size)

    paths = {
        "ppm": PPM, "hose_d": HOSE_D, "cord_d": CORD_D,
        "hose": [to_m(*p) for p in HOSE], "cord": [to_m(*p) for p in CORD], "loop": [to_m(*p) for p in LOOP],
        "drop": [to_m(*p) for p in DROP], "plug": to_m(*PLUG),
        "plate": [to_m(PLATE[2], PLATE[3]), to_m(PLATE[0], PLATE[1])],
        "bolts": [to_m(*b) for b in BOLTS],
    }
    json.dump(paths, open(os.path.join(OUT, "lg", "rear_paths.json"), "w"), indent=1)

    # ribbed hose texture: 64 px along the tube = one rib every 4.3 mm
    h = np.zeros((16, 64, 3), np.uint8)
    for i in range(64):
        t = (np.cos(i / 64 * 2 * np.pi) + 1) / 2
        v = 92 + 78 * t ** 1.2
        h[:, i] = (v, v, v + 3)
    Image.fromarray(h).save(os.path.join(OUT, "lg", "hose.jpg"), quality=92)

    if DEBUG:
        dbg = rear.copy()
        d = ImageDraw.Draw(dbg)
        for pts, col in ((HOSE, (255, 0, 0)), (CORD, (0, 255, 0)), (LOOP, (0, 255, 255)), (DROP, (255, 255, 0))):
            d.line(pts, fill=col, width=3)
            for p in pts:
                d.ellipse([p[0] - 4, p[1] - 4, p[0] + 4, p[1] + 4], outline=col)
        d.rectangle(PLATE, outline=(255, 0, 255), width=3)
        for b in BOLTS:
            d.ellipse([b[0] - 20, b[1] - 20, b[0] + 20, b[1] + 20], outline=(255, 128, 0), width=3)
        d.ellipse([PLUG[0] - 30, PLUG[1] - 30, PLUG[0] + 30, PLUG[1] + 30], outline=(255, 255, 255), width=3)
        both = Image.new("RGB", (dbg.width, dbg.height))
        dbg.crop((580, 80, 1430, 1260)).save(DEBUG)
        Image.fromarray(clean).crop((580, 80, 1430, 1260)).save(DEBUG.replace(".png", "_clean.png"))


main()
