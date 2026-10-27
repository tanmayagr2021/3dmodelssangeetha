"""Photographic skins for the fridge produce, cut from freely licensed Wikimedia Commons photos.
Run after tex_food.py: it overwrites the noise textures of the same names in <out dir>/food/ and adds leaf_curry.jpg.
The originals are downloaded (1600 px wide) into pipeline/sources/photos/produce/ the first time and kept there.
Every texture is: a crop of the fruit's skin, lit evenly (the photo's own shading and highlights divided out),
colour-balanced towards the fruit's natural colour, and blended so its left and right edges meet (u wraps round the fruit).

usage: python tex_food_photos.py <out dir>            (default pipeline/tex)
"""
import os
import sys
import urllib.parse
import urllib.request

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "sources", "photos", "produce")
OUT = os.path.join(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "tex"), "food")
UA = "SangeethaARCatalogue/1.0 (richy.viamrsh126@gmail.com)"
os.makedirs(SRC, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

# name: (Commons file, crop box as fractions x0 y0 x1 y1, output size, target mean colour, rotate degrees, flatten strength)
S = {
    "tomato": ("Red tomatoes. img 16.jpg", (0.10, 0.28, 0.32, 0.52), (384, 192), (186, 40, 30), 0, 0.9),
    "onion": ("Onion bulbs.jpg", (0.62, 0.10, 0.82, 0.28), (384, 192), (128, 56, 92), 0, 0.7),
    "potato": ("Ingredients New Potatoes, Washed (4748996147).jpg", (0.58, 0.27, 0.70, 0.36), (384, 192), (198, 164, 112), 0, 0.8),
    "carrot": ("Carrot.1.jpg", (0.42, 0.64, 0.58, 0.72), (192, 384), (232, 120, 30), 90, 0.7),
    "brinjal": ("Segmented aubergine Thailand.jpg", (0.42, 0.62, 0.72, 0.82), (192, 384), (62, 24, 84), 0, 0.6),
    "capsicum_green": ("Green Bell Pepper.jpg", (0.62, 0.52, 0.80, 0.66), (384, 192), (44, 128, 44), 0, 0.8),
    "capsicum_red": ("Red bell peppers for sale at Safeway.jpg", (0.255, 0.67, 0.315, 0.70), (384, 192), (196, 28, 28), 0, 0.8),
    "capsicum_yellow": ("Starr-070730-7878-Capsicum annuum-yellow bell pepper-Foodland Pukalani-Maui (24262367204).jpg", (0.62, 0.50, 0.94, 0.72), (384, 192), (240, 186, 22), 0, 0.8),
    "apple": ("Red Apple.jpg", (0.58, 0.22, 0.80, 0.52), (384, 192), (172, 44, 38), 0, 0.8),
    "orange": ("DFC 3928 A vibrant pile of fresh oranges with mottled green-and-orange skins ready to be picked or enjoyed.jpg", (0.50, 0.52, 0.60, 0.62), (384, 192), (236, 138, 34), 0, 0.8),
    "lemon": ("Lemon.jpg", (0.55, 0.12, 0.72, 0.26), (384, 192), (240, 206, 48), 0, 0.8),
    "banana": ("5 bananas closeup.JPG", (0.27, 0.10, 0.45, 0.90), (192, 384), (222, 184, 70), 0, 0.8),
    "grape": ("Green Grape.JPG", (0.56, 0.22, 0.62, 0.30), (384, 192), (150, 190, 92), 0, 0.8),
    "cabbage": ("Chou cabus blanc 01.jpg", (0.36, 0.20, 0.64, 0.50), (384, 192), (160, 196, 118), 0, 0.5),
    "cauliflower": ("Cauliflower white.jpg", (0.74, 0.72, 0.88, 0.80), (384, 192), (234, 224, 198), 0, 0.8),
    "coconut_shell": ("Coconuts - single and cracked open.jpg", (0.08, 0.34, 0.26, 0.52), (384, 192), (112, 74, 42), 0, 0.7),
    "coconut_flesh": ("Coconuts - single and cracked open.jpg", (0.60, 0.40, 0.72, 0.56), (256, 256), (246, 244, 236), 0, 0.9),
    "melon_rind": ("Taiwan 2009 Tainan City Organic Farm Watermelon FRD 7962.jpg", (0.30, 0.52, 0.45, 0.64), (384, 192), (48, 112, 56), 0, 0.7),
    "melon_flesh": ("Watermelon.jpg", (0.15, 0.15, 0.27, 0.19), (256, 256), (226, 62, 72), 0, 0.8),
    "okra": ("Okra (Abelmoschus esculentus) (3).jpg", (0.325, 0.10, 0.375, 0.75), (128, 384), (82, 140, 52), 0, 0.7),
    "drumstick": ("2301Moringa oleifera pod (seedpod) textures 18.jpg", (0.12, 0.47, 0.40, 0.56), (128, 384), (86, 122, 52), 90, 0.7),
    "chilli": ("Green chillies variety.jpg", (0.28, 0.55, 0.40, 0.62), (128, 384), (50, 122, 40), 0, 0.7),
    "leaf": ("Coriander Leaves.jpg", (0.44, 0.10, 0.70, 0.38), (256, 384), (66, 136, 52), 0, 0.8),
    "leaf_curry": ("'Narasingha Paat' or Curry leaves, Scientific Name- Murraya koenigii.jpg", (0.25, 0.50, 0.50, 0.75), (256, 384), (60, 130, 48), 180, 0.8),
    "egg": ("A brown chicken egg on white background.png", (0.44, 0.34, 0.62, 0.54), (256, 128), (192, 134, 92), 0, 0.9),
}


def fetch(title):
    f = os.path.join(SRC, title.replace("/", "_"))
    if not os.path.exists(f):
        u = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(title) + "?width=1600"
        open(f, "wb").write(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=90).read())
    return Image.open(f).convert("RGB")


def lum(a):
    return a @ np.array([0.299, 0.587, 0.114], np.float32)


def flatten(a, k):
    """divide out the photo's own shading and soften its highlights so the 3D lighting is the only light"""
    h, w = lum(a).shape
    sig = max(h, w) * 0.28
    L = lum(a)
    bl = np.asarray(Image.fromarray(np.clip(L, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(sig)), np.float32) + 1
    f = np.clip(L.mean() / bl, 0.55, 1.8) ** k
    a = a * f[..., None]
    # highlights: pixels far brighter than their surroundings are pulled back towards the local average
    local = np.asarray(Image.fromarray(np.clip(lum(a), 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(2, w / 24))), np.float32) + 1
    ratio = lum(a) / local
    m = np.clip((ratio - 1.25) / 0.5, 0, 1)
    soft = np.asarray(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(2, w / 18))), np.float32)
    return a * (1 - m[..., None]) + soft * m[..., None]


def grade(a, target, strength=0.75):
    """move the mean colour towards the fruit's natural colour (per-channel gain, limited), keeping the detail"""
    mean = a.reshape(-1, 3).mean(0)
    gain = (np.array(target, np.float32) / np.maximum(mean, 1)) ** strength
    return a * np.clip(gain, 0.5, 2.0)


def seamless(a, frac=0.22):
    """cross-fade the right edge into the left so u wraps without a visible seam"""
    h, w, _ = a.shape
    o = int(w * frac)
    out = a[:, : w - o].copy()
    t = np.linspace(0, 1, o)[None, :, None]
    out[:, :o] = a[:, w - o:] * (1 - t) + a[:, :o] * t
    return out


DETAIL = {"cabbage": 1.6, "cauliflower": 0.6, "tomato": 0.5, "potato": 0.5, "grape": 0.5, "banana": 0.3, "orange": 0.4, "egg": 0.4}
SAT = {"banana": 1.25, "carrot": 1.1, "onion": 1.1}


def make(name):
    title, box, size, target, rot, k = S[name]
    im = fetch(title)
    W, H = im.size
    im = im.crop((int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H)))
    if rot:
        im = im.rotate(rot, expand=True)
    w, h = size
    ow = int(w / (1 - 0.22))
    im = im.resize((ow, h), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    a = flatten(a, k)
    a = grade(a, target)
    a = seamless(a)
    a = np.clip(a, 0, 255).astype(np.uint8)
    img = Image.fromarray(a).resize((w, h), Image.LANCZOS)
    if name in SAT:
        from PIL import ImageEnhance
        img = ImageEnhance.Color(img).enhance(SAT[name])
    if name in DETAIL:
        img = img.filter(ImageFilter.UnsharpMask(radius=3, percent=int(100 * DETAIL[name]), threshold=2))
    img.save(os.path.join(OUT, name + (".jpg" if not name.startswith("coconut") else ".jpg")), quality=84, optimize=True)
    return img


if __name__ == "__main__":
    only = sys.argv[2:] or list(S)
    for n in only:
        try:
            img = make(n)
            print("wrote", n, img.size)
        except Exception as e:
            print("FAIL", n, e)
