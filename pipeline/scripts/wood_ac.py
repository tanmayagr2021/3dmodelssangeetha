# Procedural straight-grain wood veneer textures (walnut, oak) for the door fronts.
import sys, numpy as np
from PIL import Image, ImageFilter
out = sys.argv[1]
W, H = 600, 2400   # AC front panel (98 cm wide), generated upright and turned on its side

def vnoise(n, scale, rng):
    """1D value noise sampled at n points, smoothly interpolated, roughly in [-1, 1]."""
    k = int(n / scale) + 3
    pts = rng.uniform(-1, 1, k)
    x = np.arange(n) / scale
    i = np.floor(x).astype(int); f = x - i
    f = f * f * (3 - 2 * f)
    return pts[i] * (1 - f) + pts[i + 1] * f

def wood(palette, seed, contrast, streaks):
    rng = np.random.default_rng(seed)
    y = np.arange(H)[:, None].astype(float); x = np.arange(W)[None, :].astype(float)
    # gentle sideways drift of the grain down the board
    drift = (vnoise(H, 260, rng) * 3.5 + vnoise(H, 70, rng) * 1.2)[:, None]
    drift2 = (vnoise(H, 180, rng) * 3.0)[:, None]
    mix = (0.5 + 0.5 * vnoise(W, 150, rng))[None, :]
    warp = drift * mix + drift2 * (1 - mix)
    xs = x + warp
    def along(scale, amp):
        base = vnoise(W + 64, scale, rng)
        return np.interp(xs, np.arange(W + 64) - 32, base) * amp
    t = 0.5 + along(41, 0.22) + along(13, 0.12) + along(4.5, 0.07) + along(1.8, 0.035)
    # dark pore lines and long streaks
    lines = np.interp(xs, np.arange(W + 64) - 32, vnoise(W + 64, 2.6, rng))
    t -= (lines > 0.72) * 0.16 * streaks
    t += (vnoise(H, 35, rng)[:, None] * 0.03)  # slight variation along the length
    t = np.clip((t - 0.5) * contrast + 0.5, 0, 1)
    dark, mid, light = [np.array(c, float) for c in palette]
    c = np.where(t[..., None] < 0.5, dark + (mid - dark) * (t[..., None] / 0.5), mid + (light - mid) * ((t[..., None] - 0.5) / 0.5))
    img = Image.fromarray(np.clip(c, 0, 255).astype(np.uint8), "RGB")
    return img.filter(ImageFilter.GaussianBlur(0.6))

def hexrgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
teak = wood([hexrgb("#5A2A14"), hexrgb("#8A4524"), hexrgb("#B0663A")], 23, 1.45, 1.0)
cypress = wood([hexrgb("#A07A44"), hexrgb("#C9A46A"), hexrgb("#E4C995")], 31, 1.2, 0.6)
for name, im in (("teak", teak), ("cypress", cypress)):
    im = im.rotate(90, expand=True).resize((1600, 400))
    im.save(f"{out}/{name}.jpg", quality=86)
    im.crop((700, 150, 800, 250)).resize((96, 96)).save(f"{out}/{name}-swatch.jpg", quality=88)
print("ok")
