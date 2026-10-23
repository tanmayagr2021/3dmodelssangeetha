# Brief for each new product build

Site: /Users/apple/Documents/3D (call it SITE). Local-only data in SITE/private, tools in SITE/tools (neither is in git).

Goal: one real Sangeetha product, made "pitch perfect": a 3D model built to the maker's published
dimensions, its surfaces textured from the real product photos, every real moving part opening on its
own, and Apple Quick Look, Android and headset AR all working. The client (Sangeetha) compares this
against their current vendor, so it must look like the product in the photos from any angle.

## Data (never invent a number)
- Sangeetha product API (POST JSON) https://www.sangeetha.com/b/customer/api/v3/product-details with
  {"type":"desktop","product_id":"<ID>","pinCode":"560068","user_id":""}. Saved copy: SITE/private/research/sangeetha-api/p<ID>.json
  (data[0]: item_code, item_fullname, title, color, sale_price, mrp, product_specification, img_details...).
- Photos are on smpl-prod-app-v2.gumlet.io/product_img/... (from img_details). Also the brand's own product page
  (WebFetch/curl) for dimensions in mm, weight, features, and more photos. Every spec in the entry must come from
  Sangeetha or the brand; put the brand page in "source". If the brand gives none, say so in your report.
- sangeethaUrl: https://www.sangeetha.com/product-details/<slug>/<ID> where slug = item_fullname lower-cased,
  "|" -> "or", other non-alphanumerics -> "-", collapsed, plus "-" + item_code lower-cased (see the Samsung entry
  in SITE/products.json for the pattern).

## Files you own (create only these)
- SITE/pipeline/sources/photos/<slug>/*            raw downloaded photos
- SITE/pipeline/scripts/tex_<slug>.py              your texture script (copy helpers from prep_textures.py; don't edit it)
- SITE/pipeline/tex/<slug>/*                       textures it writes
- SITE/pipeline/build3d/make_<slug>.mjs            builder: `node make_<slug>.mjs <products.json> <tex dir> <out.glb>`
- SITE/pipeline/entries/<id>.json                  {"products":[<your entry>]}  (same schema as SITE/products.json)
- SITE/models/<id>.glb, SITE/models/usdz/<id>-<finish>.usdz, SITE/photos/<id>/0.jpg..3.jpg (900x900, white, centred; 0 = hero)
- SITE/logos/<brand>.png only if your assignment says so (transparent PNG, ~300 px tall, like logos/samsung.png)
- anything under SITE/.work/<slug>/ (not in git)

Do NOT edit: SITE/products.json, product.html, index.html, xr.js, lib.mjs, make_usdz.mjs, prep_textures.py,
build_usdz.sh, make_banners.mjs, banners/, or another product's files. Don't run build_usdz.sh or make_banners.mjs
(they rebuild everything). If shared code can't handle your product, prototype the fix on a copy in your work dir
and report the exact diff. The main session may update product.html / xr.js / index.html while you work; if a page
test breaks in page code rather than your model, report it.

## Model conventions (see make_samsung_rt34.mjs, make_lg_fhp1412.mjs, make_carrier_xceed.mjs and lib.mjs)
- Metres. Front faces +Z, y = 0 at the floor (bottom of the unit). Floor products centred on x and z.
  Wall units: back at z = 0, centred on x, y = 0 at the unit's bottom.
- Moving part = a named group with its pivot at the hinge: {axis, angle} or {slide:[x,y,z]}. A door hinged on its
  left edge opens with a negative y angle, right edge positive. Mark the most important part "hint": true.
  At most 3 moving parts. Parts list order = top to bottom / left to right.
- Call `stateClips(root, parts)` and, before export, `saveZones(<your entries file>, id, root, parts)` (writes each
  part's closed/open bounding box into your entry; the page uses it to know which part a tap landed on).
- Textures from the real photos (perspective-rectified fronts, control panels, logos, labels), like
  prep_textures.py does. Use flipV / frontWithHoles for UV orientation. One-sided rendering: use inward() for surfaces
  seen from inside. Real interior: shelves, bins, drum, filters etc. as the photos show them.
- Keep the GLB under ~1.2 MB and the USDZ under ~1.5 MB (jpg textures ~1024 px, quality 85-90).

## Entry fields (copy the shape of the existing entries) plus two new ones
- "hotspots": 3-4 feature callouts, each {"title": "Ice and water dispenser", "text": "<one plain sentence from the
  official feature list>", "pos": [x,y,z], "normal": [x,y,z], "show": "always" | "<partKey>" | "!<partKey>"}.
  pos is on the model surface in the model's own coordinates (metres). show "<partKey>" = only while that part is
  open (things inside), "!<partKey>" = only while it is closed (things on a door front).
- "fit": {"front": <cm needed in front for the doors/drawers to open, from geometry or the manual>,
  "sides": <cm>, "top": <cm>, "back": <cm>, "note": "<where these came from>"} — gaps only if the maker publishes
  them (installation guide / manual); otherwise omit those keys. For wall ACs use the maker's installation clearances
  if published (e.g. top/sides from the ceiling/walls).
- "orbit": a camera orbit that frames it well on desktop; check phone framing too (390x844).
- arTip like "Tap a door to open it"; summary one sentence, plain words.

## Build and check (repeat until it is right)
  cd SITE/pipeline/build3d
  node make_<slug>.mjs ../entries/<id>.json ../tex ../../models/<id>.glb
  node make_usdz.mjs ../../models/<id>.glb ../entries/<id>.json <id> SITE/.work/<slug>/usd
  SITE/tools/usdenv/bin/python ../scripts/package_usdz.py SITE/.work/<slug>/usd/<id>-<finish>.usda ../../models/usdz/<id>-<finish>.usdz   (must print 0 issues)
  SITE/tools/bin/rk_load ../../models/usdz/<file>.usdz                         (RealityKit load: must be OK)
  SITE/tools/bin/render_usdz <usdz> <out.png> [open] [yawDeg]                  (SceneKit render closed and open; look at it)
  Your own server (it serves your catalogue = the 3 existing products + yours):
    node -e 'const f=require("fs");const a=JSON.parse(f.readFileSync("SITE/products.json"));const b=JSON.parse(f.readFileSync("SITE/pipeline/entries/<id>.json"));a.products.push(...b.products);f.writeFileSync("SITE/.work/<slug>/catalog.json",JSON.stringify(a))'
    PRODUCTS=SITE/.work/<slug>/catalog.json node SITE/pipeline/scripts/serve.mjs SITE <yourServerPort> SITE/pipeline/testpages &   (run in background; kill it at the end)
  Renders vs the photos: PORT=<cdp0> node ../scripts/compare.mjs http://127.0.0.1:<yourServerPort> /models/<id>.glb <outDir> 600 800 "<orbit>" "<orbit>|S00_11" ...
    (the clip names are S<from bits>_<to bits> in parts order). LOOK at every render next to the reference photo
    (Read the PNGs) and fix proportions, colours, logos, gaps, handles, interior until it matches.
  Page tests: PORT=<cdp1> ONLY=<id> node ../scripts/test_site.mjs http://127.0.0.1:<yourServerPort> SITE/.work/<slug>/site
              PORT=<cdp2> node ../scripts/test_xr.mjs http://127.0.0.1:<yourServerPort> SITE/.work/<slug>/xr SITE/tools/iwer.min.js <id>
    Read the reports and screenshots: model loads, each part opens on its own and closes, Quick Look href and USDZ
    content type are right, headset AR/VR trigger opens each part, no errors, no horizontal overflow on phones.

## Report back (under 300 words)
id, model, final dims (and source), parts, hotspots, fit values and their source, file sizes, every check's result,
anything not verified or any shared-code change you need (with the diff), and the paths of 2-3 best renders.
