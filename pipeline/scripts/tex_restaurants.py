"""Textures for the two Bangalore restaurant brands whose packs go in the fridge model: Nandhana Palace and RNR Biryani
(both owned by the owner of Sangeetha's client company, as told to us by the user; shown with the owner's permission for the
client demo). Re-runnable: downloads the originals from the brands' own websites into
pipeline/sources/photos/brands/raw/restaurants/ (git-ignore that folder), builds the textures into pipeline/tex/brands/ and
pipeline/tex/brands/small/, then adds their entries to manifest.json and CREDITS.md (idempotent).

What each texture is:
  nandana_logo.jpg       the official logo on the brand red (nandhanarestaurants.com), unaltered apart from scaling.
  nandana_box_front.jpg  a LOGO LABEL panel: the wordmark recoloured brand red on white paper, with the two printed lines that
  nandana_tub_wrap.jpg   the real takeaway tub carries ("add spice to your life", "ANDHRA SPECIALITY RESTAURANT"), laid out as
                         in the official photo of that tub. Re-created from the logo, not a photograph (the photo shows food).
  rnr_logo.jpg           the official gold logo on white (rnrbiryani.com).
  rnr_box_front.jpg      the brand's own navy and gold mark with "TASTE OF 1953", as printed on its tin (official art).
  rnr_tin_lid.jpg        the tin lid: that same art re-arranged as on the real lid (mark left, RNR / TASTE OF 1953 right).
usage: python3 tex_restaurants.py            (from anywhere; paths are relative to the repo root)
"""
import json
import os
import urllib.request

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW = os.path.join(ROOT, "pipeline/sources/photos/brands/raw/restaurants")
OUT = os.path.join(ROOT, "pipeline/tex/brands")
SMALL = os.path.join(OUT, "small")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
SRC = {
    "nandhana_logo_full.png": "https://nandhanarestaurants.com/wp-content/uploads/2023/03/Nandhana-logo_001.png",
    "nandhana_logo_red_bg.jpeg": "https://nandhanarestaurants.com/wp-content/uploads/2023/03/nandhana-logo-red-bg.jpeg",
    "rnr_gold_logo.jpg": "https://rnrbiryani.com/wp-content/uploads/2022/12/RNR-gold-logo.jpg",
    "rnr_DonneBiriyaniRicee.png": "https://rnrbiryani.com/wp-content/uploads/2021/05/DonneBiriyaniRicee.png",
}
RED = (208, 32, 35)        # the red of nandhana-logo-red-bg.jpeg
NAVY = (10, 29, 60)        # the navy of RNR's DonneBiriyaniRicee.png
GOLD = (222, 186, 60)
os.makedirs(RAW, exist_ok=True); os.makedirs(OUT, exist_ok=True); os.makedirs(SMALL, exist_ok=True)
for name, url in SRC.items():
    p = os.path.join(RAW, name)
    if not os.path.exists(p) or os.path.getsize(p) < 1000:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r, open(p, "wb") as f:
            f.write(r.read())
        print("downloaded", name)


def save(img, name, q=88):
    img = img.convert("RGB")
    img.save(os.path.join(OUT, name), quality=q, optimize=True)
    s = img.copy(); s.thumbnail((384, 384), Image.LANCZOS)
    s.save(os.path.join(SMALL, name), quality=80, optimize=True)
    print("wrote", name, img.size)
    return img.size


def font(path, px, idx=0):
    return ImageFont.truetype(path, px, index=idx)


AV = "/System/Library/Fonts/Avenir Next.ttc"
SERIF_IT = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"

# ── Nandhana Palace ──
logo = Image.open(os.path.join(RAW, "nandhana_logo_full.png")).convert("RGBA")
a = np.asarray(logo).astype(float)
wordmark = logo.crop((a[..., 3].any(axis=0).nonzero()[0].min() - 4, 183 - 4, a[..., 3].any(axis=0).nonzero()[0].max() + 4, 371 + 4))   # rows 183..371: wordmark, flame and PALACE (the white tagline below is left out)
w = np.asarray(wordmark).astype(float)
rgb, al = w[..., :3], w[..., 3:] / 255.0
mx, mn = rgb.max(axis=2), rgb.min(axis=2)
sat = (mx - mn)
white = np.clip((mn - 150) / 70, 0, 1) * np.clip(1 - sat / 70, 0, 1)         # near-white ink -> the brand red; the orange flame stays
rec = rgb * (1 - white[..., None]) + np.array(RED, float) * white[..., None]
wm = Image.fromarray(np.dstack([rec, al * 255]).astype(np.uint8))


def paper(w_, h_, seed=3):
    rng = np.random.default_rng(seed)
    base = np.full((h_, w_, 3), 250.0)
    grain = rng.normal(0, 1.6, (h_, w_, 1))
    return Image.fromarray(np.clip(base + grain, 0, 255).astype(np.uint8))


def nandhana_panel(W, H, scale_w, y_logo, with_lines=True):
    img = paper(W, H)
    ww = int(W * scale_w); hh = int(wm.height * ww / wm.width)
    m = wm.resize((ww, hh), Image.LANCZOS)
    img.paste(m, ((W - ww) // 2, y_logo), m)
    d = ImageDraw.Draw(img)
    if with_lines:
        y = y_logo + hh + int(H * 0.075)
        d.text((W // 2, y), "add spice to your life", font=font(SERIF_IT, int(H * 0.082)), fill=RED, anchor="mm")
        d.text((W // 2, y + int(H * 0.115)), "ANDHRA SPECIALITY RESTAURANT", font=font(AV, int(H * 0.052), 0), fill=RED, anchor="mm")
    return img


red_bg = Image.open(os.path.join(RAW, "nandhana_logo_red_bg.jpeg")).convert("RGB").resize((768, 439), Image.LANCZOS)
sizes = {}
sizes["nandana_logo"] = save(red_bg, "nandana_logo.jpg")
sizes["nandana_box_front"] = save(nandhana_panel(1024, 640, 0.66, 120), "nandana_box_front.jpg")
sizes["nandana_tub_wrap"] = save(nandhana_panel(1024, 512, 0.56, 52), "nandana_tub_wrap.jpg")

# ── RNR Biryani ──
gold = Image.open(os.path.join(RAW, "rnr_gold_logo.jpg")).convert("RGB")
gold.thumbnail((768, 768), Image.LANCZOS)
sizes["rnr_logo"] = save(gold, "rnr_logo.jpg")
art = Image.open(os.path.join(RAW, "rnr_DonneBiriyaniRicee.png")).convert("RGB")
big = art.resize((int(art.width * 2), int(art.height * 2)), Image.LANCZOS)
sizes["rnr_box_front"] = save(big, "rnr_box_front.jpg")
# the lid: cut the mark and the wordmark out of the art and set them side by side on navy, as on the real lid
g = np.asarray(art).astype(int)
mask = (g[..., 0] > 140) & (g[..., 1] > 110) & (g[..., 2] < 130)
rows = np.where(mask.any(axis=1))[0]
groups, start, prev = [], rows[0], rows[0]
for r in rows[1:]:
    if r - prev > 6: groups.append((start, prev)); start = r
    prev = r
groups.append((start, prev))
mark_rows = groups[0]; text_rows = (groups[1][0], groups[-1][1])
mc = np.where(mask[mark_rows[0]:mark_rows[1] + 1].any(axis=0))[0]; tc = np.where(mask[text_rows[0]:text_rows[1] + 1].any(axis=0))[0]
mark = big.crop((mc.min() * 2 - 6, mark_rows[0] * 2 - 6, mc.max() * 2 + 6, mark_rows[1] * 2 + 6))
text = big.crop((tc.min() * 2 - 6, text_rows[0] * 2 - 6, tc.max() * 2 + 6, text_rows[1] * 2 + 6))
S = 1024
lid = Image.new("RGB", (S, S), NAVY)
mh = int(S * 0.36); mk = mark.resize((int(mark.width * mh / mark.height), mh), Image.LANCZOS)
tw = int(S * 0.34); tx = text.resize((tw, int(text.height * tw / text.width)), Image.LANCZOS)
x0 = (S - (mk.width + int(S * 0.04) + tx.width)) // 2
lid.paste(mk, (x0, (S - mk.height) // 2))
lid.paste(tx, (x0 + mk.width + int(S * 0.04), (S - tx.height) // 2))
d = ImageDraw.Draw(lid)
d.ellipse((S * 0.035, S * 0.035, S * 0.965, S * 0.965), outline=(18, 44, 88), width=int(S * 0.012))      # the tin lid's pressed rim
sizes["rnr_tin_lid"] = save(lid, "rnr_tin_lid.jpg")

# ── manifest and credits ──
mp = os.path.join(OUT, "manifest.json")
man = json.load(open(mp))
OFF = "License: logos and packaging are trademarks of their owners; shown with the owner's permission for the client's demo (the owner of the client company owns both brands, as told to us by the user)."
def entry(name, kind, real, notes, src, brand, product, px):
    return {"file": f"{name}.jpg", "kind": kind, "barcode": None, "px": list(px), "aspect": round(px[0] / px[1], 3), "real_size_mm": real,
            "notes": notes, "crop_box": [0.0, 0.0, 1.0, 1.0], "brand": brand, "product": product, "quantity": "takeaway pack",
            "source_url": src, "photographers": ["the brand's own website"], "license": OFF, "name": name}
N_SRC = "https://nandhanarestaurants.com/"
R_SRC = "https://rnrbiryani.com/"
man["nandana_logo"] = entry("nandana_logo", "flat", [160, 91, 0], "The official logo on the brand red (official spelling: Nandhana Palace). Logo art, not a pack photograph.", N_SRC + " (wp-content/uploads/2023/03/nandhana-logo-red-bg.jpeg)", "Nandhana Palace", "Logo", sizes["nandana_logo"])
man["nandana_box_front"] = entry("nandana_box_front", "flat", [150, 94, 30], "LOGO LABEL, not a photographed pack: the official wordmark recoloured brand red on white paper with the two printed lines of the real takeaway tub ('add spice to your life', 'ANDHRA SPECIALITY RESTAURANT'), laid out as in the official photo of that tub (nandhanarestaurants.com/wp-content/uploads/2023/04/Hyderabadi-Biryani-Family-Pack-scaled-1-771x1024.jpg, which shows food and so is not used). Sizes estimated.", N_SRC, "Nandhana Palace", "Takeaway tub / bag front (logo label)", sizes["nandana_box_front"])
man["nandana_tub_wrap"] = entry("nandana_tub_wrap", "wrap", [105, 52, 105], "LOGO LABEL for a round white paper tub, same design as nandana_box_front, for wrapping over about 150 degrees. Re-created from the logo; tub size estimated from the official photo.", N_SRC, "Nandhana Palace", "Takeaway tub (logo label)", sizes["nandana_tub_wrap"])
man["rnr_logo"] = entry("rnr_logo", "flat", [100, 100, 0], "The official gold RNR logo on white (the site's 'RNR gold logo'). Logo art, not a pack photograph.", R_SRC + " (wp-content/uploads/2022/12/RNR-gold-logo.jpg)", "RNR Biryani", "Logo", sizes["rnr_logo"])
man["rnr_box_front"] = entry("rnr_box_front", "flat", [150, 161, 60], "The brand's own navy and gold mark with 'TASTE OF 1953' (rnrbiryani.com/wp-content/uploads/2021/05/DonneBiriyaniRicee.png), the art printed on its navy takeaway tin and box in the official photos. Official art, upscaled 2x; use for a flat front panel.", R_SRC, "RNR Biryani", "Takeaway tin / box front (official brand art)", sizes["rnr_box_front"])
man["rnr_tin_lid"] = entry("rnr_tin_lid", "lid", [150, 150, 0], "The navy tin lid: the official mark and RNR / TASTE OF 1953 wordmark cut from the art above and set mark-left, text-right as on the real lid in the official photos (rnrbiryani.com/wp-content/uploads/2022/12/Donne-Veg-Biryani-HomeScroll3.jpg shows the closed lid; that photo shows food so it is not used). Re-arranged official art, not a photograph. Tin size estimated.", R_SRC, "RNR Biryani", "Takeaway tin lid (re-arranged official art)", sizes["rnr_tin_lid"])
json.dump(man, open(mp, "w"), indent=1, ensure_ascii=False)
cp = os.path.join(OUT, "CREDITS.md")
txt = open(cp).read() if os.path.exists(cp) else ""
mark = "<!-- restaurants -->"
block = f"""{mark}
## Nandhana Palace and RNR Biryani (restaurant brands)
Logos and packaging art taken from the brands' own websites: {N_SRC} and {R_SRC}. The names, logos and packaging designs are
trademarks of their owners. They are shown with the owner's permission for the client's demo: the user told us that the owner of
the client company owns both brands. Files: nandana_logo, nandana_box_front, nandana_tub_wrap (a re-created logo label, not a photograph),
rnr_logo, rnr_box_front, rnr_tin_lid (re-arranged official art). No food photographs are used: the fridge is vegetarian plus eggs only.
Official spelling is "Nandhana Palace"; the files use the spelling "nandana" as asked.
{mark}
"""
if mark in txt:
    a = txt.index(mark); b = txt.index(mark, a + 1) + len(mark)
    txt = txt[:a] + block.strip("\n") + txt[b:]
else:
    txt = txt.rstrip("\n") + "\n\n" + block
open(cp, "w").write(txt)
print("manifest and credits updated")
