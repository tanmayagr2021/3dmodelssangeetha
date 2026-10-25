"""Textures for the Voltas 183INV Vertis AI Zest Gold indoor unit (1.5 ton), from Voltas's own
front photo (v7.jpg, 1200 x 1200; the unit is 1.554 px per mm across, gold line at row 375).
The printing is redrawn crisp on flat white; the studio shading is not baked in.

usage: python tex_voltas_183inv.py <photos dir> <out dir>
Writes into <out dir>/voltas_183inv/.
"""
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

PHOTOS, OUT = sys.argv[1:3]
PRODUCT = "voltas_183inv"
S = 3.0                      # px per mm
XIN, H, YG = 0.443, 0.310, 0.092   # half width of the panel, unit height, top of the gold line (m)
W_PX, H_PX = round(2 * XIN * 1000 * S), round((H - YG) * 1000 * S)
FONT = "/System/Library/Fonts/Avenir Next.ttc"


def save(img, name, q=90):
    os.makedirs(os.path.join(OUT, PRODUCT), exist_ok=True)
    p = os.path.join(OUT, PRODUCT, name)
    img.convert("RGB").save(p, quality=q, optimize=True)
    print("wrote", p, img.size)


def X(xm):  # metres from centre -> px
    return W_PX / 2 + xm * 1000 * S


def Y(ym):  # metres height -> px (top of panel = 0)
    return (H - ym) * 1000 * S


def font(mm, face=0):
    return ImageFont.truetype(FONT, round(mm * S), index=face)


def panel():
    img = Image.new("RGB", (W_PX, H_PX), (247, 247, 248))
    # soft vertical shading so the dome reads as a dome without baking light (very gentle)
    g = np.linspace(1.0, 0.975, H_PX)[:, None, None]
    img = Image.fromarray((np.asarray(img).astype(float) * g).clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img, "RGBA")
    # wave ribs along the lower front (rows 255-365 of the photo): six fine lines bowing down to the middle
    top_y, bot_y = 0.165, YG + 0.004
    for i in range(7):
        t = i / 6
        pts = []
        for k in range(0, 201):
            u = k / 200
            bow = math.sin(math.pi * u) ** 1.2
            y0 = top_y - 0.040 * bow - 0.0 * u               # upper line: sags at centre
            y = bot_y + (y0 - bot_y) * (1 - t) + 0.0
            y += 0.012 * (1 - t) * (1 - bow) * (0.6 if i else 1)  # lines fan towards the ends
            pts.append((X((u - 0.5) * 2 * XIN * 0.985), Y(y)))
        d.line(pts, fill=(205, 208, 214, 150), width=3)
        d.line([(x, y + 3) for x, y in pts], fill=(255, 255, 255, 220), width=2)
    # A TATA Product (top left)
    f1, f2, f3 = font(7.0, 7), font(7.0, 8), font(7.0, 4)
    x0, y0 = X(-0.4285), Y(0.2865)
    d.text((x0, y0), "A", font=f1, fill=(90, 92, 98), anchor="lm")
    x0 += d.textlength("A ", font=f1)
    d.text((x0, y0), "TATA", font=f2, fill=(20, 22, 26), anchor="lm")
    x0 += d.textlength("TATA ", font=f2)
    d.text((x0, y0), "Product", font=f3, fill=(70, 72, 78), anchor="lm")
    # VOLTAS wordmark, silver-grey, from Voltas's own logo file
    lg = Image.open(os.path.join(PHOTOS, "..", "..", "..", "..", "logos", "voltas.png")).convert("RGBA")
    a = np.asarray(lg).astype(float)
    alpha = a[:, :, 3] / 255
    col = np.zeros_like(a)
    col[:, :, 0], col[:, :, 1], col[:, :, 2] = 92, 95, 104
    col[:, :, 3] = alpha * 255
    lg = Image.fromarray(col.astype(np.uint8))
    bb = lg.getbbox(); lg = lg.crop(bb)
    w = round(0.070 * 1000 * S); lg = lg.resize((w, round(w * lg.height / lg.width)), Image.LANCZOS)
    img.paste(lg, (round(X(0) - w / 2), round(Y(0.164) - lg.height / 2)), lg)
    # Inverter badge (right): script word with the arc under it
    fi = ImageFont.truetype(FONT, round(10.5 * S), index=3)
    d.text((X(0.394), Y(0.1895)), "Inverter", font=fi, fill=(75, 78, 86), anchor="mm")
    cx, cy = X(0.394), Y(0.1865)
    d.arc((cx - 19 * S, cy - 9 * S, cx + 19 * S, cy + 9 * S), 20, 160, fill=(95, 99, 108), width=5)
    # hidden display: a few very faint digits "24" in the middle top, as in the photo
    fd = ImageFont.truetype(FONT, round(9 * S), index=0)
    d.text((X(0), Y(0.222)), "24", font=fd, fill=(236, 237, 240), anchor="mm")
    save(img, "panel.jpg", 92)


def louvre():
    # recessed rectangle seen on the flap in the straight-on photo
    w, h = 1800, 220
    img = Image.new("RGB", (w, h), (244, 244, 246))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((60, 40, w - 60, h - 30), 10, outline=(214, 217, 222), width=3)
    d.line((70, 46, w - 70, 46), fill=(255, 255, 255), width=3)
    save(img, "louvre.jpg", 88)


panel()
louvre()
