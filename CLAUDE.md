# Sangeetha 3D and AR catalogue

A static site that shows Sangeetha's appliances in 3D and AR:
- open the doors in 3D;
- see the appliance at real size in your room with Apple Quick Look (iPhone, iPad, Vision Pro);
- Android WebXR;
- Meta Quest passthrough and VR (`xr.js`).

**Start here:** read `private/HANDOFF.md`. It has the current task, its status and the next steps. It is local only and not in git.

**Before building or changing any product,** read `pipeline/entries/BENCHMARK.md`: the quality bar, research steps and checks every product must pass.

## Layout
- **Site (repo root):**
  - `index.html` (catalogue), `product.html` (one product, `/p/<id>`), `xr.js` (headsets)
  - `products.json`
  - `models/` (GLB, plus USDZ in `models/usdz/`), `photos/`, `logos/`, `banners/` (the Quick Look banners)
- **`pipeline/`** (not deployed):
  - `build3d/` holds the Node and three.js builders, one per product, plus `lib.mjs` and `make_usdz.mjs`.
  - `scripts/` holds textures, packaging, the local server and the browser tests.
  - `entries/BRIEF.md` is the recipe for adding a product.
- **`private/`** holds client files, research and pitch decks. **`tools/`** holds local tools. Both are gitignored. Never commit them.

## Deploy
Pushing to `main` of https://github.com/tanmayagr2021/3dmodelssangeetha deploys the Vercel project "3dmodelssangeetha".
- That repo is the user's personal GitHub. Push as `tanmayagr2021`, never as `tanmay-viamagus`.
- Don't run `vercel deploy` for this project.

## Rules
- The repo is public. Keep prices, vendor names and client-internal data out of committed files.
- Every spec and number comes from Sangeetha or the brand's own pages. Never invent one.
- AR and VR quality come first.
- Say plainly what was only checked in emulators and not on real devices.
