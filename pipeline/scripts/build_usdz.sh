#!/bin/bash
# Rebuilds every Apple Quick Look file (.usdz) for the site from its GLB.
# Needs node (run `npm install` in ../build3d once) and uv for Pixar's USD tools.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
DEMO=$(cd "$HERE/../.." && pwd)
WORK=${WORK:-$(mktemp -d)}
PY=${PY:-"uv run -q --python 3.12 --with usd-core python"}
mkdir -p "$WORK" "$DEMO/models/usdz"
cd "$HERE/../build3d"
node -e '
const { products } = require(process.argv[1]);
for (const p of products) console.log(p.id, p.glb, p.placement || "floor");
' "$DEMO/products.json" | while read -r id glb placement; do
  node make_usdz.mjs "$DEMO$glb" "$DEMO/products.json" "$id" "$WORK"
  # floor products also get a copy without the floor anchor, opened by product links with ?ql=free
  [ "$placement" = wall ] || node make_usdz.mjs "$DEMO$glb" "$DEMO/products.json" "$id" "$WORK" free
done
rm -f "$DEMO"/models/usdz/*.usdz
for f in "$WORK"/*.usda; do
  $PY "$HERE/package_usdz.py" "$f" "$DEMO/models/usdz/$(basename "${f%.usda}").usdz"
done
ls -la "$DEMO/models/usdz"
