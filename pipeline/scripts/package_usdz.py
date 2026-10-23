"""Packs a .usda and its textures into a .usdz, then runs Pixar's validators on it.

The scene stays as text USD. Binary USD written by Pixar's tools stores the scene's
`sceneName` field (which Quick Look's behaviours use) in a form RealityKit refuses to
load, so text is the safe choice. USDZ is an uncompressed zip whose first file is the
scene and whose file data starts on 64-byte boundaries.
usage: python package_usdz.py <scene.usda> <out.usdz>
"""
import os
import re
import struct
import sys
import zipfile


def pack(usda_path, out_path):
    base = os.path.dirname(usda_path)
    text = open(usda_path, encoding="utf-8").read()
    assets = sorted(set(re.findall(r"@([^@]+)@", text)))
    entries = [(os.path.basename(usda_path), usda_path)] + [(a, os.path.join(base, a)) for a in assets]
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_STORED) as z:
        for arcname, src in entries:
            data = open(src, "rb").read()
            info = zipfile.ZipInfo(arcname, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_STORED
            offset = z.fp.tell() + 30 + len(arcname.encode())
            pad = (-offset) % 64
            if pad and pad < 4:
                pad += 64
            if pad:
                info.extra = struct.pack("<HH", 0x1986, pad - 4) + b"\0" * (pad - 4)
            z.writestr(info, data)
    with zipfile.ZipFile(out_path) as z:
        for info in z.infolist():
            start = info.header_offset + 30 + len(info.filename.encode()) + len(info.extra)
            assert start % 64 == 0, (info.filename, start)
    return entries


def check(out_path):
    try:
        from pxr import Usd, UsdValidation
    except ImportError:
        print("  (pxr not available, skipped compliance check)")
        return
    stage = Usd.Stage.Open(out_path)
    validators = UsdValidation.ValidationRegistry().GetOrLoadAllValidators()
    errors = UsdValidation.ValidationContext(validators).Validate(stage)
    seen = set()
    for e in errors:
        key = (e.GetName(), e.GetMessage()[:120])
        if key in seen:
            continue
        seen.add(key)
        print(f"  {e.GetType()}: {e.GetName()}: {e.GetMessage()[:200]}")
    print(f"  validation: {len(errors)} issue(s)")


if __name__ == "__main__":
    usda, out = sys.argv[1], sys.argv[2]
    entries = pack(usda, out)
    print(f"packed {out} ({os.path.getsize(out) / 1024:.0f} KB): {', '.join(a for a, _ in entries)}")
    check(out)
