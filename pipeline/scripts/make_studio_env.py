# The studio light the web 3D view uses (env/studio.hdr): a plain grey room lit like a product shoot,
# with a big soft key light front left, two tall strip lights either side of the front and one overhead.
# The strips are what show a finish: they lay long highlights down a door, so brushed lines, film gloss
# and paint ripple catch the light as the model turns. AR uses the real room's light instead.
#
# Directions follow three.js's equirectangular mapping (image centre = +x, a quarter to the right = +z,
# the front of every model; top row = straight up). Each row of the room is one flat value, so the
# file compresses well with Radiance's run-length encoding.
# usage: python make_studio_env.py <out.hdr>
import sys

import numpy as np

W, H = 1024, 512
lon = ((np.arange(W) + 0.5) / W - 0.5) * 2 * np.pi            # atan2(z, x)
lat = (0.5 - (np.arange(H) + 0.5) / H) * np.pi                  # up is +
LON, LAT = np.meshgrid(lon, lat)
d = np.stack([np.cos(LAT) * np.cos(LON), np.sin(LAT), np.cos(LAT) * np.sin(LON)], -1)

# the room: darker floor, mid-grey walls, a lighter ceiling (one value per row). Mid grey, not white:
# dark glass and black plastic must still read as black, with the lights as the only bright reflections.
t = np.sin(lat)[:, None, None]
room = np.where(t < 0, 0.22 + 0.12 * (1 + t), 0.36 + 0.20 * np.maximum(t, 0) ** 1.5) * np.ones((H, W, 3))


def softbox(az_deg, el_deg, half_w_deg, half_h_deg, power):
    """A rectangular white light seen from the model: azimuth from the front (+z, positive toward +x), elevation."""
    az, el = np.radians(az_deg), np.radians(el_deg)
    centre = np.array([np.sin(az) * np.cos(el), np.sin(el), np.cos(az) * np.cos(el)])
    right = np.array([np.cos(az), 0, -np.sin(az)])
    up = np.cross(right, centre)
    facing = d @ centre
    x = np.degrees(np.arctan2(d @ right, facing))
    y = np.degrees(np.arctan2(d @ up, facing))
    edge = lambda v, half: np.clip((half - np.abs(v)) / 1.5 + 0.5, 0, 1)   # 1.5 degree soft edge
    m = (facing > 0) * edge(x, half_w_deg) * edge(y, half_h_deg)
    return m[..., None] * power


img = room.copy()
img += softbox(-45, 30, 32, 24, 5.5)            # key, front left, above eye level
img += softbox(50, 20, 24, 22, 3.0)             # fill, front right
img += softbox(28, 5, 4, 40, 5.0)               # tall strip, front right: the highlight down a door
img += softbox(-15, 5, 2.5, 40, 3.0)            # thin strip, front left
img += softbox(85, 10, 6, 35, 3.0)              # side strip, right
img += softbox(0, 80, 25, 25, 2.0)              # overhead
img += softbox(160, 25, 12, 20, 1.5)            # rim from behind


def rgbe(px):
    m = px.max(-1)
    e = np.floor(np.log2(np.maximum(m, 1e-32))) + 1
    scale = np.where(m > 1e-32, 256 / np.exp2(e), 0)
    out = np.zeros(px.shape[:-1] + (4,), np.uint8)
    out[..., :3] = np.clip(px * scale[..., None], 0, 255).astype(np.uint8)
    out[..., 3] = np.where(m > 1e-32, e + 128, 0).astype(np.uint8)
    return out


def rle(channel):
    """Radiance's run-length code for one channel of one scanline."""
    out, i, n = bytearray(), 0, len(channel)
    while i < n:
        j = i
        while j < n and j - i < 127 and channel[j] == channel[i]:
            j += 1
        if j - i >= 3:
            out += bytes([128 + j - i, channel[i]]); i = j; continue
        j = i
        while j < n and j - i < 128 and not (j + 2 < n and channel[j] == channel[j + 1] == channel[j + 2]):
            j += 1
        out += bytes([j - i]) + bytes(channel[i:j]); i = j
    return out


data = rgbe(img.astype(np.float64))
with open(sys.argv[1], "wb") as f:
    f.write(b"#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n" + f"-Y {H} +X {W}\n".encode())
    for row in data:
        f.write(bytes([2, 2, W >> 8, W & 255]))
        for c in range(4):
            f.write(rle(row[:, c].tobytes()))
print(sys.argv[1], f"{W}x{H}", "mean", img.mean().round(3), "max", img.max().round(2))
