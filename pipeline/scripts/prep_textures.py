"""Makes the surface textures for the three Sangeetha demo products from the official
product photos and brand logos.

usage: python prep_textures.py <photos dir> <logos dir> <out dir>
  photos: samsung/0.jpg (front), samsung/1.jpg (energy label), lg/0.jpg (front), carrier/*.jpg
  logos:  samsung.png, lg.png, carrier.png (transparent PNGs)
Textures are written per product into <out dir>/<product>/.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

PHOTOS, LOGOS, OUT = sys.argv[1:4]
rng = np.random.default_rng(7)


def save(img, product, name, quality=90):
    os.makedirs(os.path.join(OUT, product), exist_ok=True)
    path = os.path.join(OUT, product, name)
    if name.endswith(".jpg"):
        img.convert("RGB").save(path, quality=quality, optimize=True)
    else:
        img.save(path, optimize=True)
    print("wrote", path, img.size)


def brushed(w, h, strength=6.0, streak=180):
    """Horizontal hairline noise, the look of brushed metal under a clear coat."""
    n = rng.normal(0, 1, (h, w // 4 + 1))
    n = np.repeat(n, 4, axis=1)[:, :w]
    img = Image.fromarray(((n * 0.5 + 0.5).clip(0, 1) * 255).astype(np.uint8))
    img = img.filter(ImageFilter.GaussianBlur((streak / 40, 0.4)))
    a = (np.asarray(img).astype(float) / 255 - 0.5) * 2 * strength
    return a


def logo(name, height_px, colour=None):
    im = Image.open(os.path.join(LOGOS, name)).convert("RGBA")
    w = round(im.width * height_px / im.height)
    im = im.resize((w, height_px), Image.LANCZOS)
    if colour:
        r, g, b = colour
        alpha = im.split()[3]
        im = Image.new("RGBA", im.size, (r, g, b, 255))
        im.putalpha(alpha)
    return im


# ── Samsung RT34HG5A42BXHL, Luxe Black: 630 W x 1710 H mm ──
def samsung():
    px_mm = 1.6  # texture pixels per millimetre across the door
    W = 630
    freezer_h, fridge_h = 568, 1096
    total = freezer_h + fridge_h

    # colour from the official front photo: a soft light-to-dark fall over both doors
    top, bottom = np.array([86, 87, 92.0]), np.array([27, 28, 32.0])
    def door(h_mm, y0_mm):
        w, h = round(W * px_mm), round(h_mm * px_mm)
        t = (y0_mm + np.arange(h) / px_mm) / total            # 0 at the top of the freezer door
        t = t ** 0.8
        col = top[None, :] * (1 - t[:, None]) + bottom[None, :] * t[:, None]
        img = np.repeat(col[:, None, :], w, axis=1)
        img += brushed(w, h, 4.5)[:, :, None]
        # a faint highlight band down the left third, as the studio light shows it
        x = np.linspace(0, 1, w)
        img += (np.exp(-((x - 0.28) / 0.22) ** 2) * 7)[None, :, None]
        return Image.fromarray(img.clip(0, 255).astype(np.uint8))

    freezer = door(freezer_h, 0)
    fridge = door(fridge_h, freezer_h)

    # the BEE energy label, as it sits on the freezer door in the photo
    lab = Image.open(os.path.join(PHOTOS, "samsung/1.jpg")).convert("RGB").crop((304, 121, 768, 958))
    lw, lh = round(130 * px_mm), round(226 * px_mm)
    lab = lab.resize((lw, lh), Image.LANCZOS)
    freezer.paste(lab, (round((W - 56 - 130) * px_mm), round(76 * px_mm)))

    # the SAMSUNG badge just below the door gap
    badge = logo("samsung.png", round(9 * px_mm), (196, 199, 204))
    fridge.paste(badge, (round((W * px_mm - badge.width) / 2), round(18 * px_mm)), badge)

    save(freezer, "samsung", "freezer-door.jpg")
    save(fridge, "samsung", "fridge-door.jpg")

    # the inside control panel on the fridge wall
    panel = Image.new("RGB", (420, 260), (246, 247, 248))
    d = ImageDraw.Draw(panel)
    d.rounded_rectangle((8, 8, 412, 252), 18, outline=(214, 217, 220), width=3)
    badge = logo("samsung.png", 26, (60, 64, 70))
    panel.paste(badge, ((420 - badge.width) // 2, 34), badge)
    for i, x in enumerate((90, 210, 330)):
        d.ellipse((x - 26, 120, x + 26, 172), outline=(150, 156, 162), width=4)
        d.rectangle((x - 30, 196, x + 30, 204), fill=(200, 204, 208))
    save(panel, "samsung", "inner-panel.jpg")


# ── LG FHP1412Z9B, Platinum Black: 600 W x 850 H mm, photo at about 1 px per mm ──
def lg():
    src = Image.open(os.path.join(PHOTOS, "lg/0.jpg")).convert("RGB")
    left, right, top, foot = 231, 829, 113, 964           # body edges in the photo
    band_bottom = 218                                     # control panel strip ends here
    drawer_right = 440                                    # detergent drawer front ends here
    scale = 2

    # the control strip (dial, programme names, display, buttons) is redrawn crisp by tex_lg_panel.py,
    # which also writes knob_top.jpg and the button caps; the rear and side photos are handled by tex_lg_rear.py.
    # Run both after this script; they own panel.jpg, rear.jpg, side_l.jpg, side_r.jpg, tubplate.jpg, hose.jpg.
    drawer = src.crop((left, top, drawer_right, band_bottom))
    drawer = drawer.resize((drawer.width * scale, drawer.height * scale), Image.LANCZOS)
    save(drawer, "lg", "drawer.jpg")

    # main front below the strip, with the door painted out (the door is its own part)
    front = src.crop((left, band_bottom, right, foot - 14)).resize(((right - left) * scale, (foot - 14 - band_bottom) * scale), Image.LANCZOS)
    a = np.asarray(front).astype(float)
    body = np.array([70, 68, 69.0])
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy, r = (535 - left) * scale, (495 - band_bottom) * scale, 268 * scale
    door = ((xx - cx) ** 2 + (yy - cy) ** 2) < r ** 2
    shade = body[None, None, :] + brushed(w, h, 3.0)[:, :, None]
    shade += (yy / h * 10)[:, :, None]
    a[door] = shade[door]
    save(Image.fromarray(a.clip(0, 255).astype(np.uint8)), "lg", "front.jpg")

    # plain body metal for the sides and top
    side = np.full((512, 512, 3), body) + brushed(512, 512, 3.5)[:, :, None]
    save(Image.fromarray(side.clip(0, 255).astype(np.uint8)), "lg", "side.jpg")

    # inner drawer tray: white compartments, blue softener cap
    tray = Image.new("RGB", (400, 240), (238, 240, 242))
    d = ImageDraw.Draw(tray)
    d.rectangle((10, 10, 250, 230), outline=(205, 208, 212), width=6)
    d.rectangle((262, 10, 390, 120), outline=(205, 208, 212), width=6)
    d.rounded_rectangle((280, 140, 372, 222), 14, fill=(64, 118, 214))
    save(tray, "lg", "tray.jpg")

    # stainless drum: brushed steel with rows of small perforations
    dw, dh = 1024, 512
    drum = np.full((dh, dw, 3), [176, 179, 183.0]) + brushed(dw, dh, 5.0)[:, :, None]
    img = Image.fromarray(drum.clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    for row, y in enumerate(range(12, dh, 24)):
        for x in range(12 + (row % 2) * 12, dw, 24):
            d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(70, 72, 76))
    save(img, "lg", "drum.jpg")


# ── Carrier XCEED EDGE GXi 1.5 ton: indoor unit front 940 W x 275 H mm ──
def carrier():
    # 1.5 ton (19K) indoor unit: Carrier's variant table lists 306 H x 985 W x 217 D mm.
    # The front panel is the 208 mm above the louvre slot.
    px_mm = 2.0
    W, H = 985, 208
    w, h = round(W * px_mm), round(H * px_mm)
    base = np.full((h, w, 3), [244, 245, 247.0])
    yy, xx = np.mgrid[0:h, 0:w] / np.array([h, w])[:, None, None]
    # the faceted front as in Carrier's photo of the same design: a lighter trapezoid bounded by two diagonals
    # (from 5% across at the top to 28% across at 82% of the height) and a horizontal crease at 82% of the height
    crease_y, x_top, x_foot = 0.82, 0.053, 0.283
    edge = x_top + (x_foot - x_top) * np.clip(yy / crease_y, 0, 1)
    left_plane = (xx < edge) & (yy < crease_y)
    right_plane = (xx > 1 - edge) & (yy < crease_y)
    lower = yy >= crease_y
    base[left_plane] -= 9
    base[right_plane] -= 11
    base[lower] -= 6
    base += (np.sin(yy * np.pi) * 3)[:, :, None]
    img = Image.fromarray(base.clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    line = (200, 203, 212)
    d.line([(x_top * w, 0.04 * h), (x_foot * w, crease_y * h), ((1 - x_foot) * w, crease_y * h), ((1 - x_top) * w, 0.04 * h)], fill=line, width=3)
    # the Carrier oval, centred a little below the middle (the photo has it at 56% of the panel height)
    oval = logo("carrier.png", round(34 * px_mm))
    img.paste(oval, ((w - oval.width) // 2, round(0.56 * h - oval.height / 2)), oval)
    # the feature badge at the right end of the crease, cropped from Carrier's photo (the photo is the 1 ton unit
    # of the same design; the badge is about 61 x 22 mm there, assumed the same here)
    ph = Image.open(os.path.join(PHOTOS, "carrier/1.jpg")).convert("RGB")
    badge = ph.crop((435, 281, 470, 297)).resize((round(61 * px_mm), round(22 * px_mm)), Image.LANCZOS)
    bx, by = round((0.925 * W - 61 / 2) * px_mm), round(0.76 * h - 11 * px_mm)
    region = np.asarray(img.crop((bx, by, bx + badge.width, by + badge.height))).astype(float)
    ba = np.asarray(badge).astype(float)
    delta = ba - np.median(ba.reshape(-1, 3), axis=0)
    delta *= np.clip((np.abs(delta).max(axis=2, keepdims=True) - 8) / 25, 0, 1)
    img.paste(Image.fromarray((region + delta).clip(0, 255).astype(np.uint8)), (bx, by))
    save(img, "carrier", "front.jpg")

    louvre = np.full((round(64 * px_mm), w, 3), [240, 241, 243.0])
    louvre += (np.linspace(6, -8, louvre.shape[0]))[:, None, None]
    save(Image.fromarray(louvre.clip(0, 255).astype(np.uint8)), "carrier", "louvre.jpg")

    # filters behind the front panel: a fine grey mesh
    m = np.full((256, 256, 3), 200.0)
    m[::6, :] -= 50
    m[:, ::6] -= 50
    save(Image.fromarray(m.clip(0, 255).astype(np.uint8)), "carrier", "filter.jpg")


samsung()
lg()
carrier()
