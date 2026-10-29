// Samsung WA70BG4441BYTL, 7 kg top-load washing machine, Lavender Gray body with a Black Caviar lid.
// Built to the size on Sangeetha's listing, 540 W x 988 H x 568 D mm, and to Samsung's own photos: the side photo gives the
// profile (a deck that slopes up toward the back, a raised rear control panel, a black base plinth, four feet); the overhead panel photo
// and the manual's drawing give the control panel; the drum photo gives the diamond drum, Magic Filter and three-fin pulsator.
// The lid hinges at the back and has a tinted window; the detergent box is a drawer in the tub rim that slides toward you.
// usage: node make_samsung_wa70.mjs <products.json> <tex dir> <out.glb>
import { THREE, mat, mesh, box, faced, group, flipV, inward, stateClips, exportGLB, productParts, saveZones } from "./lib.mjs";

const [PRODUCTS, TEX, OUT] = process.argv.slice(2);
const ID = "samsung-wa70bg4441bytl";
const T = `${TEX}/samsung_wa70`;

// ── size (metres); z runs front (+) to back (-), xf is the distance from the front edge ──
const W = 0.54, H = 0.988, D = 0.568;
const zF = D / 2, zB = -D / 2, Db = 0.560;                   // body back at xf = Db; the rear valves reach xf = D
const xz = (xf) => zF - xf;
const plinthTop = 0.080, footH = 0.029, bodyTop = 0.835;
const plateY = (xf) => 0.8455 + 0.0917 * xf;                 // the grey top plate slopes up toward the back
const topY = (xf) => 0.876 + 0.1333 * (xf - 0.03);           // the black lid's upper surface (measured on Samsung's side photo)
const WD = 0.526;                                            // the black deck is a little narrower than the body
const HINGE = 0.40;                                          // the lid ends and the control panel begins at xf = 0.40
const PEAK = [0.5116, 0.9757];                               // top edge of the control panel

// ── materials ──
const bodyM = mat("Body", 0xffffff, { rough: 0.55 });
const frontM = mat("Front", 0xffffff, { rough: 0.55 });
const sideL = mat("SideL", 0xffffff, { rough: 0.55 });
const sideR = mat("SideR", 0xffffff, { rough: 0.55 });
const topM = mat("TopPlate", 0xffffff, { rough: 0.6 });
const black = mat("BlackPlastic", 0x141416, { rough: 0.42 });
const blackGloss = mat("BlackGloss", 0x0d0d0f, { rough: 0.22 });
const plinthM = mat("Plinth", 0x151517, { rough: 0.75 });
const footM = mat("Foot", 0x101112, { rough: 0.8 });
const glassM = mat("LidGlass", 0x0b0d10, { rough: 0.05, opacity: 0.34 });
const panelM = mat("PanelFace", 0xffffff, { rough: 0.25 });
const ringM = mat("PowerRing", 0xffffff, { rough: 0.3 });
const labelM = mat("LabelBEE", 0xffffff, { rough: 0.5, opacity: 0.999 });
const tubGrey = mat("TubGrey", 0x9ea0a7, { rough: 0.5 });
const tubDark = mat("TubDark", 0x6c6e75, { rough: 0.6 });
const drumM = mat("DiamondDrum", 0xffffff, { rough: 0.35, metal: 0.25, side: THREE.DoubleSide });
const pulsM = mat("Pulsator", 0xa4a6ad, { rough: 0.5, side: THREE.DoubleSide });
const finM = mat("PulsatorFin", 0xb4b6bc, { rough: 0.5 });
const detM = mat("DetergentFace", 0xffffff, { rough: 0.45 });
const detBox = mat("DetergentBox", 0xa9abb2, { rough: 0.5 });
const detCup = mat("DetergentCup", 0xd8dadf, { rough: 0.5 });
const filterM = mat("MagicFilter", 0xffffff, { rough: 0.5 });
const steelM = mat("Hinge", 0x9a9da3, { metal: 0.8, rough: 0.35 });
const brass = mat("Brass", 0xc9a24a, { metal: 0.85, rough: 0.35 });
const hose = mat("DrainHose", 0xbfc2c7, { rough: 0.6 });
const cordM = mat("Cord", 0x2a2b2e, { rough: 0.6 });
const plugM = mat("Plug", 0x2c2d30, { rough: 0.5 });
const pinM = mat("Pin", 0xb7bbc0, { metal: 0.9, rough: 0.3 });
const rubber = mat("Rubber", 0x0f1011, { rough: 0.9 });

const cyl = (name, rt, rb, h, m, x, y, z, seg = 24) => mesh(name, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
// an extrusion of a side profile (points given as [xf, y]) across the full width, normals and UVs kept simple
// a strip of the top plate: from xf0 to xf1 front to back, from x0 to x1 across
function plateStrip(name, xf0, xf1, x0, x1, material) {
  const m = sideSlab(name, [[xf0, bodyTop], [xf0, plateY(xf0)], [xf1, plateY(xf1)], [xf1, bodyTop]], x1 - x0, material);
  m.position.set((x0 + x1) / 2, 0, zF);
  return m;
}
function sideSlab(name, pts, w, material, origin = { xf: 0, y: 0 }) {
  const s = new THREE.Shape();
  pts.forEach(([xf, y], i) => { const px = xf - origin.xf, py = y - origin.y; i ? s.lineTo(px, py) : s.moveTo(px, py); });
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
  g.rotateY(Math.PI / 2);                  // shape x (the distance from the front) now runs toward -z, the extrusion along +x
  g.translate(-w / 2, 0, 0);
  return mesh(name, g, material);
}

const root = group("SamsungWA70");
const cab = group("Cabinet");
root.add(cab);

// ── base: four feet and the black plinth ──
for (const sx of [-1, 1]) for (const xf of [0.06, 0.50]) cab.add(cyl("Foot", 0.019, 0.022, footH, footM, sx * (W / 2 - 0.05), footH / 2, xz(xf), 20));
cab.add(box("Plinth", W - 0.012, plinthTop - footH, Db - 0.012, plinthM, 0, (plinthTop + footH) / 2, zF - 0.006 - (Db - 0.012) / 2));

// ── body: lavender-grey plastic, with the relief of Samsung's side panels ──
const bodyH = bodyTop - plinthTop;
{ // four walls, open at the top and the floor (the tub stands inside)
  const t = 0.012, yc = plinthTop + bodyH / 2;
  cab.add(faced("BodyFront", W, bodyH, t, [bodyM, bodyM, bodyM, bodyM, frontM, bodyM], 0, yc, zF - t / 2));
  cab.add(faced("BodyBack", W, bodyH, t, [bodyM, bodyM, bodyM, bodyM, bodyM, bodyM], 0, yc, zF - Db + t / 2));
  cab.add(faced("BodyLeft", t, bodyH, Db - 2 * t, [bodyM, bodyM, bodyM, bodyM, bodyM, bodyM], -W / 2 + t / 2, yc, zF - Db / 2));
  cab.add(faced("BodyRight", t, bodyH, Db - 2 * t, [bodyM, bodyM, bodyM, bodyM, bodyM, bodyM], W / 2 - t / 2, yc, zF - Db / 2));
}
for (const [sx, m] of [[-1, sideL], [1, sideR]]) {
  const p = mesh("SideDecal", flipV(new THREE.PlaneGeometry(Db - 0.004, bodyH - 0.004)), m, sx * (W / 2 + 0.0006), plinthTop + bodyH / 2, zF - Db / 2);
  p.rotation.y = sx * Math.PI / 2;
  cab.add(p);
}
// the sloped grey top plate, from the body's top to the line Samsung's side photo shows
const wellW = 0.47, wellD = 0.358, wellX0 = 0.042;           // opening in the plate (xf from 0.042 to 0.40)
cab.add(plateStrip("PlateFront", 0, wellX0, -W / 2, W / 2, topM));
cab.add(plateStrip("PlateBack", wellX0 + wellD, Db, -W / 2, W / 2, topM));
cab.add(plateStrip("PlateLeft", wellX0, wellX0 + wellD, -W / 2, -wellW / 2, topM));
cab.add(plateStrip("PlateRight", wellX0, wellX0 + wellD, wellW / 2, W / 2, topM));
// the body below the plate at the opening is filled by the well floor (below)
// energy label: Samsung's own for this model, on the front at the right
{
  const lw = 0.088, lh = 0.165;
  cab.add(mesh("LabelBEE", flipV(new THREE.PlaneGeometry(lw, lh)), labelM, -W / 2 + 0.444, 0.682, zF + 0.0007));
}

// ── the well: a pit in the top plate with the tub ring, the diamond drum and everything in it ──
const drumR = 0.186, drumXf = wellX0 + wellD / 2 + 0.002;
const dz = xz(drumXf);
const rimY = plateY(drumXf) - 0.018;
const drumDepth = 0.43;
{
  // the well: a floor plate round the tub ring (a rectangle with a round hole) and four walls up to the plate
  const fs = new THREE.Shape();
  fs.moveTo(-wellW / 2, -wellD / 2); fs.lineTo(wellW / 2, -wellD / 2); fs.lineTo(wellW / 2, wellD / 2); fs.lineTo(-wellW / 2, wellD / 2); fs.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, drumR + 0.004, 0, Math.PI * 2, true); fs.holes.push(hole);
  const fg = new THREE.ShapeGeometry(fs, 64);
  fg.rotateX(-Math.PI / 2);
  cab.add(mesh("WellFloor", fg, tubGrey, 0, rimY + 0.006, xz(wellX0 + wellD / 2)));
  const wallH = plateY(wellX0 + wellD / 2) - (rimY + 0.006);
  const wz = xz(wellX0 + wellD / 2), wy = rimY + 0.006 + wallH / 2;
  cab.add(box("WellBack", wellW, wallH, 0.004, tubGrey, 0, wy + 0.012, wz - wellD / 2 + 0.002));
  cab.add(box("WellFront", wellW, wallH, 0.004, tubGrey, 0, wy - 0.012, wz + wellD / 2 - 0.002));
  cab.add(box("WellLeft", 0.004, wallH, wellD, tubGrey, -wellW / 2 + 0.002, wy, wz));
  cab.add(box("WellRight", 0.004, wallH, wellD, tubGrey, wellW / 2 - 0.002, wy, wz));
  // tub ring: a grey collar from the plate down into the drum
  const ring = new THREE.LatheGeometry([new THREE.Vector2(drumR + 0.03, 0), new THREE.Vector2(drumR + 0.018, -0.007), new THREE.Vector2(drumR + 0.004, -0.015), new THREE.Vector2(drumR, -0.03)], 64);
  cab.add(mesh("TubRing", ring, tubGrey, 0, rimY + 0.012, dz));
  // drum wall, inward-facing, with the repeating diamond pattern
  const g = new THREE.CylinderGeometry(drumR, drumR, drumDepth, 64, 1, true);
  const uv = g.attributes.uv;
  const uRep = (2 * Math.PI * drumR) / 0.19, vRep = drumDepth / 0.19;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uRep, 1 - uv.getY(i) * vRep);
  inward(g);
  cab.add(mesh("DiamondDrum", g, drumM, 0, rimY - drumDepth / 2 - 0.02, dz));
  // drum floor and the pulsator: a low dish with three curved fins and a ring of small holes
  const floorY = rimY - drumDepth - 0.02;
  cab.add(cyl("DrumFloor", drumR, drumR, 0.01, tubDark, 0, floorY, dz, 48));
  const dish = new THREE.LatheGeometry([new THREE.Vector2(0.0, 0.026), new THREE.Vector2(0.05, 0.024), new THREE.Vector2(0.11, 0.012), new THREE.Vector2(0.15, 0.0)], 48);
  cab.add(mesh("Pulsator", dish, pulsM, 0, floorY + 0.005, dz));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const fin = mesh("PulsatorFin", new THREE.BoxGeometry(0.085, 0.022, 0.018), finM, Math.cos(a) * 0.09, floorY + 0.032, dz + Math.sin(a) * 0.09);
    fin.rotation.y = -a; cab.add(fin);
  }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; cab.add(cyl("PulsatorHole", 0.0035, 0.0035, 0.003, rubber, Math.cos(a) * 0.045, floorY + 0.022, dz + Math.sin(a) * 0.045, 8)); }
  // Magic Filter: a mesh cartridge on the drum wall at the back, two columns of slots
  const mf = mesh("MagicFilter", flipV(new THREE.BoxGeometry(0.075, 0.3, 0.014)), [tubGrey, tubGrey, tubGrey, tubGrey, filterM, tubGrey], 0, rimY - 0.19, dz - drumR + 0.012);
  cab.add(mf);
  cab.add(box("MagicFilterHousing", 0.095, 0.31, 0.012, tubGrey, 0, rimY - 0.19, dz - drumR + 0.004));
}
// hinge pins and covers on the plate behind the lid
for (const sx of [-1, 1]) cab.add(box("HingeCover", 0.06, 0.03, 0.04, black, sx * 0.19, plateY(HINGE) + 0.015, xz(HINGE) - 0.02));

// ── lid: hinged at its back edge, a black frame with a tinted window; the soft-close damper is the grey block at the hinge ──
const lid = group("Lid", 0, (topY(HINGE) + plateY(HINGE) + 0.004) / 2, xz(HINGE));
{
  const hy = lid.position.y;
  const pts = [[0.0, plateY(0.0) + 0.012], [0.004, topY(0.0) - 0.004], [0.03, topY(0.03)], [HINGE, topY(HINGE)], [HINGE, plateY(HINGE) + 0.004], [0.03, plateY(0.03) + 0.004]];
  // local frame: shape x = zlocal = HINGE - xf (grows toward the front), shape y = y - hinge height
  const s = new THREE.Shape();
  pts.forEach(([xf, y], i) => { const px = HINGE - xf, py = y - hy; i ? s.lineTo(px, py) : s.moveTo(px, py); });
  const g = new THREE.ExtrudeGeometry(s, { depth: WD - 0.024, bevelEnabled: true, bevelSize: 0.011, bevelThickness: 0.012, bevelSegments: 4 });
  g.rotateY(-Math.PI / 2); g.translate((WD - 0.024) / 2, 0, 0);
  lid.add(mesh("LidFrame", g, black, 0, 0, 0));
  // window: a dark glass pane on the sloped top, framed by the plastic
  const wx = 0.46, wd = 0.318, wxf = 0.075 + wd / 2;
  const slope = Math.atan(0.1333);
  const pane = new THREE.BoxGeometry(wx, 0.003, wd / Math.cos(slope));
  const pm = mesh("LidWindow", pane, glassM, 0, topY(wxf) - hy + 0.0008, HINGE - wxf);
  pm.rotation.x = slope;
  lid.add(pm);
  // the pane's gloss inner frame
  const fr = mesh("LidWindowEdge", new THREE.BoxGeometry(wx + 0.016, 0.0015, (wd + 0.016) / Math.cos(slope)), blackGloss, 0, topY(wxf) - hy + 0.0003, HINGE - wxf);
  fr.rotation.x = slope; lid.add(fr);
  // hinge barrels at the back corners and a finger notch at the front
  for (const sx of [-1, 1]) lid.add(cyl("HingeBarrel", 0.011, 0.011, 0.045, steelM, sx * 0.19, 0, 0.0, 16).rotateZ(Math.PI / 2));
  lid.add(box("LidDamper", 0.09, 0.012, 0.02, tubDark, 0, (plateY(HINGE) - hy) + 0.006, -0.005));
}
root.add(lid);

// ── rear control panel: the slab behind the lid, the panel plane (Samsung's own layout), raised pads for the ring and the keys ──
{
  const [px, py] = PEAK;
  const slab = [[HINGE, plateY(HINGE) - 0.004], [HINGE, topY(HINGE)], [px, py], [0.524, 0.984], [0.545, 0.988], [Db + 0.004, 0.97], [Db + 0.004, plateY(Db) - 0.004]];
  cab.add(sideSlab("PanelBlock", slab, WD, black).translateZ(zF));
  const dx = px - HINGE, dy = py - topY(HINGE), len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  const cx = xz((HINGE + px) / 2), cy = (topY(HINGE) + py) / 2;
  const pg = group("PanelPlane", 0, cy, cx);
  pg.rotation.x = ang;                      // face tilted up toward the back, so its normal leans toward the shopper
  pg.position.y += 0.0009; pg.position.z += 0.0;
  const face = mesh("PanelFace", flipV(new THREE.PlaneGeometry(W, len)), panelM, 0, 0.0004, 0);
  face.rotation.x = -Math.PI / 2;
  pg.add(face);
  // raised pads (1 mm): the ring, the cycle selector and the key bar, placed in the panel's own frame (x across, z down the slope)
  const mmPx = 1.563, cw = 844, ch = 205, sc = len / 0.131;
  const ux = (cxp) => (cxp - 422) / mmPx / 1000, uz = (cyp) => ((cyp - ch / 2) / mmPx / 1000) * sc;
  void cw;
  const ring = mesh("PowerRing", new THREE.RingGeometry(0.0238, 0.0262, 64), ringM, ux(423), 0.0007, uz(107));
  ring.rotation.x = -Math.PI / 2; pg.add(ring);
  root.add(pg);
}
// the lid-to-panel line, a shadow strip
cab.add(box("LidGap", W - 0.02, 0.002, 0.003, rubber, 0, topY(HINGE) - 0.0005, xz(HINGE) + 0.0015));

// ── detergent box: a drawer in the tub rim behind the tub, with two cups; it slides toward you ──
const det = group("DetergentBox", 0, plateY(0.365) - 0.021, xz(0.366));
{
  det.add(mesh("DetFace", new THREE.BoxGeometry(0.19, 0.032, 0.075), detBox, 0, 0.02, 0));
  const lidTop = mesh("DetLid", flipV(new THREE.PlaneGeometry(0.182, 0.066)), detM, 0, 0.0365, 0);
  lidTop.rotation.x = -Math.PI / 2; det.add(lidTop);
  det.add(box("DetPull", 0.09, 0.01, 0.01, detBox, 0, 0.02, 0.042));
}
cab.add(det);

// ── the back: water inlet valves, the power cord with its plug, the drain hose (positions estimated from the manual's drawing) ──
{
  for (const [sx, colr] of [[-1, brass], [1, brass]]) {
    cab.add(cyl("InletValve", 0.012, 0.012, 0.008, black, sx * 0.17, 0.89, zB + 0.004, 16).rotateX(Math.PI / 2));
    cab.add(cyl("InletThread", 0.0105, 0.0105, 0.0015, colr, sx * 0.17, 0.89, zB + 0.00075, 16).rotateX(Math.PI / 2));
  }
  const pts = [[-0.19, 0.30], [-0.215, 0.22], [-0.2, 0.14], [-0.15, 0.12], [-0.08, 0.115]].map(([x, y]) => new THREE.Vector3(x, y, zB - 0.006));
  cab.add(mesh("PowerCord", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), 70, 0.004, 6, false), cordM));
  const plug = mesh("Plug", new THREE.BoxGeometry(0.045, 0.042, 0.02), plugM, -0.075, 0.115, zB - 0.016);
  cab.add(plug);
  for (const [dx, dy] of [[0, 0.0105], [-0.0095, -0.0065], [0.0095, -0.0065]]) cab.add(cyl("PlugPin", 0.0026, 0.0026, 0.016, pinM, -0.075 + dx, 0.115 + dy, zB - 0.034, 10).rotateX(Math.PI / 2));
  const hp = [[0.17, 0.18], [0.2, 0.26], [0.18, 0.36], [0.15, 0.44], [0.17, 0.5]].map(([x, y]) => new THREE.Vector3(x, y, zB - 0.016));
  cab.add(mesh("DrainHose", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp, false, "centripetal"), 60, 0.0105, 10, false), hose));
}

const parts = productParts(PRODUCTS, ID);
const clips = stateClips(root, parts);
saveZones(PRODUCTS, ID, root, parts);
await exportGLB(root, clips, OUT, {
  Body: `${T}/body.jpg`, Front: `${T}/front.jpg`, SideL: `${T}/side_l.jpg`, SideR: `${T}/side.jpg`, TopPlate: `${T}/top.jpg`,
  PanelFace: `${T}/panel.jpg`, LabelBEE: `${T}/label.png`, DiamondDrum: `${T}/drum.jpg`, Pulsator: `${T}/pulsator.jpg`,
  DetergentFace: `${T}/detergent.jpg`, MagicFilter: `${T}/filter.jpg`,
}, { dir: `${TEX}/grain`, materials: {
  // Grain (BENCHMARK.md section 10): painted Lavender Gray body (factory paint is fine: the soft peel;
  // the full one looked like embossed leather up close), moulded black plinth
  Body: { type: "peel_soft" }, Front: { type: "peel_soft" }, SideL: { type: "peel_soft" }, SideR: { type: "peel_soft" }, TopPlate: { type: "peel_soft" },
  BlackPlastic: { type: "peel_strong" }, Plinth: { type: "peel_strong" },
} });
