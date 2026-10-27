"""Real-brand pack textures for the fridge stock, cut from Open Food Facts front photos (CC-BY-SA).
Run fetch_brands.py first (it downloads the raw photos into pipeline/sources/photos/brands/raw/).

usage: python tex_brands.py [name ...]      (no names: every item)
Writes pipeline/tex/brands/<name>.jpg, manifest.json and CREDITS.md.

Kinds
  flat  the front panel of a pouch, carton, pack or tub lid, cropped square to its edges
  wrap  the label region of a can or bottle, to be wrapped round a cylinder over about 150 degrees
Each crop box is (x0, y0, x1, y1) as fractions of the raw photo, chosen by eye for that photo.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "sources", "photos", "brands", "raw")
OUT = os.path.join(HERE, "..", "tex", "brands")
os.makedirs(OUT, exist_ok=True)

# name: (barcode, kind, box, rotate_deg, max_px, real_size_mm [w, h, d], notes)
ITEMS = {
    # ── dairy ──
    "amul_butter":          ("8901262010016", "flat", (0.0, 0.0, 1.0, 0.985), 0, 768, [85, 55, 32], "100 g salted butter wrapper, top face"),
    "amul_cheese_slices":   ("8901262020015", "flat", (0.03, 0.02, 0.97, 0.97), 0, 768, [150, 150, 30], "200 g slices pack front"),
    "amul_paneer":          ("8901262180016", "flat", (0.2, 0.01, 0.98, 0.99), 0, 768, [150, 190, 35], "200 g malai paneer pouch, hand cropped out"),
    "amul_taaza_carton":    ("8901262150217", "flat", (0.10, 0.0, 0.83, 0.995), 0, 768, [64, 150, 40], "Amul Taaza 500 ml Tetra pack front"),
    "amul_taaza_pouch":     ("8901262260121", "flat", (0.02, 0.05, 0.98, 0.98), 0, 768, [150, 160, 30], "Amul Taaza milk pouch"),
    "nandini_toned_milk":   ("8906036670014", "flat", (0.03, 0.06, 0.98, 0.97), 0, 768, [150, 160, 30], "Nandini pasteurised toned milk 500 ml pouch (Kannada and English)"),
    "aavin_milk":           ("8904011301601", "flat", (0.0, 0.0, 1.0, 1.0), 0, 768, [150, 160, 30], "Aavin premium milk pouch (Tamil and English)"),
    "amul_masti_buttermilk": ("8901262200196", "flat", (0.24, 0.0, 0.615, 0.985), 0, 768, [52, 105, 36], "Amul Masti spiced buttermilk 200 ml carton"),
    "nandini_curd_pouch":   ("8906036670212", "flat", (0.02, 0.03, 0.99, 0.985), 0, 768, [150, 160, 30], "Nandini curd pouch (Kannada: mosaru)"),
    "amul_masti_dahi_pouch": ("8901262200677", "flat", (0.0, 0.0, 1.0, 0.90), 0, 768, [110, 160, 30], "Amul Masti dahi pouch"),
    "amul_curd_pouch":      ("8901262202428", "flat", (0.02, 0.04, 0.99, 0.98), 0, 768, [120, 160, 30], "Amul curd pouch"),
    "heritage_curd":        ("8904089975339", "flat", (0.0, 0.03, 1.0, 0.92), 0, 768, [160, 90, 25], "Heritage total curd pouch (Telugu and English)"),
    "amul_masti_dahi_lid":  ("8901262201124", "lid", (0.02, 0.02, 0.98, 0.98), 0, 512, [100, 100, 0], "Amul Masti dahi cup lid, top view, circular"),
    "id_batter":            ("8906020580015", "flat", (0.0, 0.0, 1.0, 0.87), 0, 768, [220, 160, 40], "iD Idly & Dosa batter 1 kg pouch"),
    # ── juices ──
    "real_mixed_fruit":     ("4796008920049", "flat", (0.0, 0.0, 0.94, 1.0), 0, 768, [64, 190, 40], "Real mixed fruit juice 1 L carton (source photo is small)"),
    "real_mango":           ("8901207004391", "flat", (0.0, 0.0, 1.0, 1.0), 0, 768, [64, 190, 40], "Real Fruit Power mango 1 L carton"),
    # ── ghee, pickle, spice ──
    "amul_ghee_pouch":      ("8901262030366", "flat", (0.02, 0.02, 0.98, 0.98), 0, 768, [120, 170, 35], "Amul pure ghee pouch"),
    "nandini_ghee_pouch":   ("8906036670885", "flat", (0.0, 0.0, 0.93, 1.0), 0, 768, [110, 190, 35], "Nandini pure ghee pouch (Kannada: shuddha tuppa)"),
    "aavin_ghee_jar":       ("8904011311044", "wrap", (0.06, 0.40, 0.96, 0.78), 0, 768, [95, 45, 95], "Aavin ghee jar label, jar photographed straight on"),
    "mothers_mango_pickle": ("8906001055440", "wrap", (0.14, 0.18, 0.84, 0.68), 0, 768, [95, 55, 95], "Mother's Recipe mango pickle jar label (Arabic edition for export, text partly Arabic)"),
    "sakthi_sambar_powder": ("8906002080328", "flat", (0.0, 0.0, 0.95, 1.0), 0, 768, [90, 130, 20], "Sakthi sambar powder 100 g pack (Tamil Nadu)"),
    # ── ice cream, frozen ──
    "amul_vanilla_magic_lid": ("8901262173490", "flat", (0.0, 0.0, 1.0, 1.0), 0, 768, [160, 160, 0], "Amul Vanilla Magic tub lid, top view"),
    "amul_rajbhog_lid":     ("8901262173599", "flat", (0.0, 0.0, 0.98, 0.98), 0, 768, [160, 160, 0], "Amul Rajbhog tub lid, top view"),
    "viswas_parotta":       ("8908000274570", "flat", (0.0, 0.02, 1.0, 0.89), 0, 768, [190, 160, 30], "Viswas Malabar porotta 6 pieces pack"),
    "nitya_parotta":        ("8906069491433", "flat", (0.02, 0.07, 0.98, 0.99), 0, 768, [190, 190, 30], "Nitya Malabar parotta pack, hand at the top cropped"),
    "fresho_green_peas":    ("8904256714099", "flat", (0.03, 0.0, 0.92, 1.0), 0, 768, [120, 190, 30], "Fresho frozen green peas 500 g (source photo is small)"),
    # ── cans and bottles (label wraps) ──
    "thumsup_can":          ("8901764041259", "wrap", (0.0, 0.14, 0.80, 0.86), 0, 768, [66, 115, 66], "Thums Up slim can body"),
    "coke_label":           ("5449000030245", "wrap", (0.24, 0.40, 0.70, 0.72), 0, 768, [95, 60, 95], "Coca-Cola Original Taste PET label (global design); also used on the can"),
    "fanta_label":          ("8901764022272", "wrap", (0.08, 0.60, 0.94, 0.90), 0, 768, [100, 60, 100], "Fanta orange 750 ml PET label; also used on the can"),
    "sprite_label":         ("8901764032905", "wrap", (0.05, 0.25, 0.95, 0.80), 0, 768, [110, 90, 110], "Sprite 2.25 L PET label"),
    "thumsup_label":        ("8901764042904", "wrap", (0.26, 0.22, 0.74, 0.52), 0, 768, [95, 75, 95], "Thums Up PET label"),
    "maaza_label":          ("8901764092107", "wrap", (0.0, 0.22, 0.98, 0.86), 0, 768, [95, 80, 95], "Maaza mango 1.5 L PET label, bottle held sideways"),
    "bisleri_label":        ("8906017290040", "wrap", (0.05, 0.40, 0.95, 0.60), 0, 768, [65, 65, 65], "Bisleri 1 L label"),
}


def flatten(im, strength=0.35):
    """take out uneven lighting: divide by a heavily blurred copy of the luminance, blended in by `strength`"""
    a = np.asarray(im).astype(np.float32)
    lum = a.mean(axis=2)
    bg = np.asarray(Image.fromarray(lum.astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(im.size) / 6)), np.float32) + 1
    k = (lum.mean() / bg) ** strength
    return Image.fromarray(np.clip(a * k[..., None], 0, 255).astype(np.uint8))


def make(name):
    code, kind, box, rot, maxpx, size, note = ITEMS[name]
    src = Image.open(os.path.join(RAW, code + ".jpg")).convert("RGB")
    W, H = src.size
    x0, y0, x1, y1 = box
    im = src.crop((round(x0 * W), round(y0 * H), round(x1 * W), round(y1 * H)))
    if rot:
        im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    # fine detail first: downscale big photos to about 2x the output, then flatten the light, then the final size
    s = min(1.0, maxpx * 2 / max(im.size))
    if s < 1:
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    im = flatten(im)
    im = ImageOps.autocontrast(im, cutoff=0.5)
    s = maxpx / max(im.size)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    if kind == "lid":
        # round lid: keep the circle, paint outside it white
        m = Image.new("L", im.size, 0)
        from PIL import ImageDraw
        ImageDraw.Draw(m).ellipse((0, 0, im.width - 1, im.height - 1), fill=255)
        white = Image.new("RGB", im.size, (255, 255, 255))
        im = Image.composite(im, white, m)
    p = os.path.join(OUT, name + ".jpg")
    im.save(p, quality=86, optimize=True)
    return {"file": name + ".jpg", "kind": kind, "barcode": code, "px": list(im.size), "aspect": round(im.width / im.height, 3), "real_size_mm": size, "notes": note, "crop_box": list(box)}


def credits(manifest):
    L = ["# Credits for the brand pack textures", "",
         "Every texture in this folder is cut from a front-of-pack photo on Open Food Facts (https://world.openfoodfacts.org), "
         "contributed by its volunteers and licensed CC-BY-SA (the Open Food Facts image licence). The photos were cropped, "
         "straightened in lighting and resized; no other change was made to the artwork.", "",
         "The brand names, logos and packaging designs shown (Amul, Nandini, Aavin, Heritage, iD, Real, Maaza, Coca-Cola, Fanta, Sprite, "
         "Thums Up, Bisleri, Mother's Recipe, Sakthi, Viswas, Nitya, Fresho and others) are trademarks of their owners and appear only to "
         "illustrate an everyday Indian fridge in a retail demonstration. No endorsement is implied.", "",
         "| Texture | Product | Open Food Facts page | Contributors |", "| --- | --- | --- | --- |"]
    for n, r in sorted(manifest.items()):
        who = ", ".join(r.get("photographers", [])) or "Open Food Facts contributors"
        L.append(f"| {r['file']} | {r.get('brand')} {r.get('product')} ({r.get('quantity')}) | {r['source_url']} | {who} |")
    open(os.path.join(OUT, "CREDITS.md"), "w").write("\n".join(L) + "\n")


if __name__ == "__main__":
    names = sys.argv[1:] or list(ITEMS)
    manifest = {}
    mp = os.path.join(OUT, "manifest.json")
    if os.path.exists(mp):
        manifest = json.load(open(mp))
    for n in names:
        r = make(n)
        meta = json.load(open(os.path.join(RAW, r["barcode"] + ".json")))
        r.update({
            "brand": meta.get("brands"), "product": meta.get("product_name"), "quantity": meta.get("quantity"),
            "source_url": f"https://world.openfoodfacts.org/product/{r['barcode']}",
            "photographers": meta.get("photographers_tags", [])[:3], "license": "CC-BY-SA (Open Food Facts contributors)",
        })
        manifest[n] = r
        print(n, r["px"], r["aspect"])
    json.dump(manifest, open(mp, "w"), indent=1, ensure_ascii=False)
    credits(manifest)
