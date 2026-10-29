# Fine surface grain for the product panels: tiled normal and roughness maps that show the
# finish up close (the brushed lines under a steel-look door film, the orange peel of paint).
# Each map tiles seamlessly (made with FFT filters, so the noise wraps around) and is laid on a
# second UV set measured in metres (lib.mjs grain), so the grain is the same real size everywhere.
#
#   hairline_n.jpg, hairline_soft_n.jpg, hairline_r.jpg
#       1024 x 256 px over 100 x 100 mm: lines run along the image's height, 10.24 px/mm across
#       the lines and 2.56 along. The soft map is the same lines, shallower.
#   peel_n.jpg, peel_soft_n.jpg, peel_strong_n.jpg
#       512 x 512 px over 128 x 128 mm (4 px/mm), bumps of 1-3 mm, at three depths.
# Each depth is its own file because Apple's AR view wants normal maps at the standard scale.
#
# Normal maps are saved as JPEG without chroma subsampling: subsampling bends encoded normals.
# usage: python tex_grain.py <out dir>      (pipeline/tex/grain)
import os
import sys

import numpy as np
from PIL import Image

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(20261029)


def filtered(shape, response):
    """White noise shaped by a filter on its 2D spectrum. The result wraps, so it tiles."""
    h, w = shape
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    spec = np.fft.fft2(rng.standard_normal(shape)) * response(fx, fy)
    a = np.real(np.fft.ifft2(spec))
    return (a - a.mean()) / a.std()


def normal_map(height, px_mm_x, px_mm_y, slope):
    """Tangent-space normals from a height field. `slope` is the spread of the surface tilt."""
    dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * px_mm_x / 2
    dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * px_mm_y / 2
    k = slope / np.sqrt((dx ** 2 + dy ** 2).mean())
    n = np.dstack([-dx * k, dy * k, np.ones_like(height)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return Image.fromarray(np.clip((n * 0.5 + 0.5) * 255 + 0.5, 0, 255).astype(np.uint8))


def save(img, name):
    img.save(os.path.join(out, name), quality=94, subsampling=0, optimize=True)
    print(name, img.size, f"{os.path.getsize(os.path.join(out, name)) // 1024} KB")


# ── hairline (brushed) ──
# Fine lines 0.1-0.3 mm wide and centimetres long, plus a few deeper scratches.
H, W = 256, 1024
fine = filtered((H, W), lambda fx, fy: np.exp(-(fx / 0.22) ** 2) * np.exp(-(fy / 0.012) ** 2))
coarse = filtered((H, W), lambda fx, fy: np.exp(-(fx / 0.05) ** 2) * np.exp(-(fy / 0.006) ** 2))
scratch = filtered((H, W), lambda fx, fy: np.exp(-(fx / 0.35) ** 2) * np.exp(-(fy / 0.02) ** 2))
scratch = np.where(scratch > 2.2, scratch - 2.2, 0)          # sparse: only the strongest few
height = 0.65 * fine + 0.35 * coarse - 1.2 * scratch
save(normal_map(height, 10.24, 2.56, 0.16), "hairline_n.jpg")
save(normal_map(height, 10.24, 2.56, 0.10), "hairline_soft_n.jpg")
# roughness multiplier (glTF reads green; blue is metalness and stays 1): the lines catch the light
r = 0.9 - 0.07 * fine - 0.05 * coarse + 0.08 * scratch
rough = np.dstack([np.full((H, W), 255), np.clip(r, 0.7, 1) * 255, np.full((H, W), 255)]).astype(np.uint8)
save(Image.fromarray(rough), "hairline_r.jpg")

# ── orange peel (paint and moulded plastic) ──
# A soft band of bumps around 2 mm across, the way sprayed or coil-coated paint flows out.
N = 512
f0 = 1 / 8                                                    # 8 px = 2 mm at 4 px/mm
peel = filtered((N, N), lambda fx, fy: np.exp(-((np.hypot(fx, fy) - f0) / 0.05) ** 2))
save(normal_map(peel, 4, 4, 0.05), "peel_n.jpg")
save(normal_map(peel, 4, 4, 0.02), "peel_soft_n.jpg")
save(normal_map(peel, 4, 4, 0.07), "peel_strong_n.jpg")
