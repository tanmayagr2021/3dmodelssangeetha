# The benchmark every product must meet (read this before building any product)

This is the standard the three live products (Samsung RT34HG5A42BXHL, LG FHP1412Z9B, Carrier 19K XCEED EDGE GXi) were brought
to, and the one every new product is held to. `BRIEF.md` says how to add an entry; this says how good it has to be and how we get there.
The owner's words: *"exactly like the original, every intricate detail, delivery worthy, text clear and readable, moving parts as the
appliance has them, the interior decorated, Indian (south Indian) contents, evidence for every number."*

## 0. The rules that never bend
1. **Never invent a fact.** Every size, spec and label comes from the maker, Sangeetha's listing, the maker's manual or a photo.
   Each number is tagged in `private/` notes as VERIFIED (a published source or a test that ran), ESTIMATED (read off photos,
   method written down) or UNVERIFIED. Never present an estimate as a published figure.
2. **Sources beat memory.** The Sangeetha listing for the exact product id, the maker's product page, the maker's support page (the
   owner's manual PDF, linked from it), the maker's gallery images at their largest size, the energy label. Check the *variant*:
   makers publish one table for several sizes (Carrier's 1-ton, 1.5-ton and 2-ton rows are on one page). A wrong row gave us a wrong model once.
3. **Do not use another model's picture.** A label or panel photo is only used if it names this exact model.
4. Public repo: no prices, no competitor or vendor names, no client-internal data in committed files. `private/` and `tools/` are never committed.
5. Say plainly what was only tested in emulators. Nothing here has run on a real iPhone, Android phone, Quest or Vision Pro unless a note says so.
6. Never push or deploy without being told to. Push as `tanmayagr2021`.

## 1. Research (do all of it before modelling)
- The product list (the spreadsheet in `private/`): brand, model code, description, product id, links. The product id fetches the listing:
  `POST https://www.sangeetha.com/b/customer/api/v3/product-details {"type":"desktop","product_id":"<ID>","pinCode":"560068","user_id":""}`.
  If it answers "not published", the product is not in the catalogue yet: use the maker's page and say so.
- Maker's product page, loaded in headless Chrome (`pipeline/scripts/cdp.mjs`) to list every image request; download the largest rendition
  (LG: the `2010x1334` gallery set, `-DZ-` shots, `spec` drawing, rear and open views; Samsung: Scene7 `?$ORIGIN_JPG$`).
- Maker's support page for the model -> owner's manual PDF. It gives: the parts diagram, the control-panel diagram (vector, perfect for
  text), installation clearances, door swing angles, drawer and shelf names. Samsung posts its manual as a 2-page poster: render at 600 dpi and crop.
- Sangeetha's own photos of the exact product (7-8 images, 1080 px), usually including its energy label and a control-panel close-up.
- Do not bypass bot protection on manual sites. If a site blocks, note it and use the maker's own copy.
- Keep everything in `private/research/<slug>/` and the downloads in `pipeline/sources/photos/<slug>/` (photos only, small; no manuals or PDFs in git).

## 2. What "exactly like the original" means
**Shape and size**
- Body at the published W x H x D in metres, front +Z, floor y=0, centred on x and z (wall units: back at z=0). Measure the exported GLB and USDZ
  programmatically (`private/` scratch `dims.mjs`) and compare with the published figure. A bevel grows a solid: shrink the extruded outline by the bevel.
- Silhouette, door thickness and gaps, handle shape or recess, hinges and covers, corner radii, feet and rollers, vents and grilles, side panel
  embossing, top plate, back and underside. From the photos at known mm scale; for each fitting, say if it is measured or estimated.
- The back: power cord with its Indian plug, hose and drain, compressor bay, back panel shape, rating plate. Modelled in 3D where the real one stands out.

**Materials**
- Door fronts, sides, plastics, glass, rubber, metal each get their own material with sensible metalness and roughness. No mirror-chrome on steel.
- Photo textures for printed surfaces only. Brushed metal is generated in the model's own colours, matched to the photo.

**Text and graphics (the readability rule)**
- Every word, number and icon on the product must be sharp when zoomed in. Photos are too soft to enlarge, so: erase each word from an upscaled copy of
  the photo and set it again, fitted to the box it has in the photo (`pipeline/scripts/tex_lg_panel.py` is the reference). Icons come from the vector
  control-panel diagram in the manual; seven-segment digits are drawn as polygons.
- Check at the zoom a customer would use (field of view 9 degrees, 2x pixel ratio), not just at the default view.
- Texture size: 7.2 px/mm for control panels, 2-4 px/mm elsewhere. Budget: GLB about 1.5 MB, USDZ about 2.5 MB. Say so when over.
- The energy label sticker uses this model's label. If the label in hand is another model's, do not use it; say it is missing.

**Controls are physical**
- Knobs, buttons and touch bars are raised 3D parts (a knob has a skirt, ring and brushed top; a button has a ring and a cap), not flat pictures.

**Moving parts are the appliance's own**
- A double-door fridge has two doors, each hinged on its real side, opening to the maker's published angle. A top-load washer has a lid hinged at the back.
  A drawer slides; a flap swings; a louvre pivots on its real axis. A door rotates round its hinge, never its centre.
- At most three parts (`BRIEF.md`); name the most important `hint`. Part order: top to bottom, left to right.
- Closed, open and every mix must be correct. The GLB has 2^n state clips plus `Rest` first; the USDZ uses the closed/open copy swap with
  parked copies (no visibility toggling). Never rename or reorder clips. Verify with the page test and the Apple importer.

**The inside is decorated, and decorated for the buyer**
- Appliance interiors are modelled from the open-door photos: every shelf, bin, drawer, light, vent, filter, knob and label the photo shows, with
  real names ("Fresh Zone", "Convertible").
- Refrigerators are stocked for the Indian, and especially south Indian, kitchen: an egg tray with eggs in the egg bin (the 6- or 12-slot tray);
  curd/dahi tubs and a steel tiffin; idli and dosa batter in a tub; coconut chutney pot; filter-coffee decoction bottle; milk sachets; buttermilk
  packets; ghee and pickle jars; fresh curry leaves, coriander, green chillies, drumsticks, brinjal, ladies' finger, tomato, onion, banana, coconut halves;
  water bottles (1 L and 2 L), soft-drink cans, fruit in the crisper; ice-cream tubs and frozen parathas, peas and meat packs in the freezer.
  Anything that shows in the maker's own stocked photo is kept where the photo puts it.
- If the product makes ice (a dispenser or a twist/slide tray), that part works: the tray slides or the maker is a visible, animated part, with ice cubes in it.
- Washing machines: the drum with its real hole or diamond pattern, the pulsator or the lifters, the filter, the detergent drawer or box with its real
  compartments, the door gasket. Air conditioners: filters, coil, vanes, louvres, pipe bundle only where a photo shows it.
- Stock moves with the part it sits in (door bins swing with the door).

## 3. Everything a product page needs
- `products.json` entry (shape of the existing ones): finishes with a USDZ per colour, `parts` with `zone` boxes (written by `saveZones`),
  `fit` (front, sides, back, top and a source note, only what the maker publishes), `specs` rows, 4 `hotspots` with copy from the maker's feature list,
  `orbit`, `arTip`, `summary`, `sizeNote`, `source`, `sangeethaUrl` (if listed).
- 4 photos at `photos/<id>/0-3.jpg` (900x900, white, centred, 0 = hero), taken from Sangeetha's and the maker's own photos.
- `logos/<brand>.png` (exists for LG, Samsung, Carrier, Bosch, Haier, Voltas).
- Quick Look banner via `make_banners.mjs`; Apple USDZ via `make_usdz.mjs` + `package_usdz.py`.
- The textures script for the product (`pipeline/scripts/tex_<slug>.py`) so the textures can be rebuilt.

## 4. How a product is built and checked (same every time)
1. Research (section 1) and write `private/research/<slug>/NOTES.md`: facts, sources, VERIFIED / ESTIMATED / UNVERIFIED.
2. Textures script -> `pipeline/tex/<slug>/`. Look at each texture next to its source.
3. Builder `pipeline/build3d/make_<slug>.mjs` (copy the nearest existing product). Build into a **staging copy of the site**, never over the live files:
   a scratch folder with symlinks to the site's pages and its own `models/`, a copy of `products.json`, and a server on another port.
4. Look at it: front, 3/4, side, back, top, close-ups of every text area (field of view 9 degrees), every part open, in the web viewer; then the USDZ in
   `tools/bin/render_usdz` (closed and open). Compare each against the maker's photo at the same angle.
5. Measure the GLB and USDZ bounds against the published size.
6. Fix, repeat. Promote the staged files only when they pass. `products.json` changes are small text edits in the file's own format (use `tidyJSON`).
7. Tests, all with 0 failures and no console errors: `test_site.mjs`, `test_features.mjs`, `test_xr.mjs` (Quest emulator, every product), `test_room.mjs`
   (photo tool), plus USDZ validation (0 issues).
8. Write what was estimated and what was left out (nothing is silently dropped) into `private/FIDELITY_NOTES.md` and `private/HANDOFF.md`.
9. Commit with a plain message; push only when told.

## 5. What we still cannot claim
Real-device behaviour (scale, floor contact, taps in Quick Look and Scene Viewer, Quest in a room), the maker's own typeface where we retypeset text,
and any figure marked ESTIMATED. Higher-resolution sources do not exist for most products; where a photo is soft we redraw, we do not invent.

## 6. Lessons from the first two builds under this benchmark (LG GLT2526XWPZ fridge, Samsung WA70BG4441BYTL top-loader)
- **A part inside another part.** The ice tray lives behind the freezer door and the detergent box sits under the lid. Give such a part `"needs": "<outer part key>"` in its products.json entry. The product page, the Quest scene and the tap test all open the outer part first and close the inner part before the outer one. Quick Look cannot enforce it (each part is independent there), but the inner part cannot be tapped while hidden.
- **Check a flat part's tap point.** Test taps use the middle of the closed part's front face; a flat lid is tapped on its top surface (test_features.mjs does this automatically).
- **Test scale by width.** `test_room.mjs` checks the drawn front width against the pinhole prediction, because a sloped or stepped top recedes and changes the silhouette's height.
- **Building from the manual.** Maker manuals give the part names, the door swing (an angle or a plan-view dimension), the clearances and a vector panel drawing. Render the drawing at 1000+ dpi and reuse its ink for icons and text (`tex_lg_panel.py`, `tex_samsung_wa70.py`). Its callout discs and frame must be removed.
- **Interiors.** Stock is separate small meshes grouped with the shelf or door they sit on, so it swings with the door. Printed labels on tubs and jars are wrapped round the cylinder (an open cylinder segment), never a flat plane. Keep the glass clear enough that the food shows.
- **Never rewrite products.json with a different formatter.** The file is `json.dumps(indent=2)`; builders that call `saveZones` run against a staging copy and the zones are copied back (see how `setzones.py` was used in this session), otherwise the whole file shows as changed.
- **Size budget.** About 1.5 MB GLB and 2.5 MB USDZ. The fridge came to 1.4 MB and 2.8 MB (about 1,000 small meshes, and each door is stored twice for Quick Look); lower segment counts on food items first.

## 7. Lessons from the third batch (LG GLT3426SNPZ fridge, Bosch WGA1420PIN washer, Voltas 183INV AC)
- **Fridge stock is Indian and recognisable** (owner's rule): eggs in the egg basket, idli batter and dosa batter in separate labelled tubs, curd, sambar, chutney, ghee, pickle, filter coffee, and Coke, Fanta, Thums Up and Sprite in cans (wrapped print on each can) and 2.25 L bottles. Labels are drawn by `tex_lg_glt3426.py` (`can_*.jpg`, `bottle_*.jpg`, `lbl_*.jpg`) and reused by the other fridge builders. Keep label words inside their box (check PAROTTA, GREEN PEAS, ICE CREAM).
- **A hotspot dot on a part blocks the headset tap.** In `xr.js` a hotspot ("spot") is picked before the part under it, so never put a hotspot at the centre of a part (the flap's centre). Offset it sideways.
- **Colour-neutral 360 frames** (Bosch sides) are recoloured from their luminance to the maker's colour; textures render about 25% brighter in the viewer, so darken (`SHADE`).
- **Avenir Next Condensed** matches the print width of Bosch's panel; Avenir Next suits the Voltas front.
- **Hinged flaps must stay above the floor** when open (Bosch pump flap: 90 degrees, not 105).
- **When the maker shows no photo of a part open, do not invent it.** Voltas gave no photo of the lifted front, so only the flap moves.
- **Never run a builder against the real products.json**: `saveZones` rewrites it with `tidyJSON` and the diff explodes. Build against `pipeline/entries/<id>.json`, then insert the entry with a python `json.dumps(indent=2, ensure_ascii=False)` round trip.
- **Cut-outs of maker graphics** (Voltas photos): mask by low saturation on the purple backdrop, close and keep the largest piece (cv2); clean the energy label of its callout dots.
- Fridge sizes: with the full stock the GLB is about 1.7 MB and the USDZ about 3.3 MB.
