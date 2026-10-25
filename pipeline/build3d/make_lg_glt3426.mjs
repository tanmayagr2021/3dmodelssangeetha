// LG GLT3426SNPZ.APZZEBN, 343 L double-door refrigerator, Shiny Steel.
// Built to LG's published size, 600 W x 1720 H x 710 D mm (LG's page, spec drawing and the Sangeetha listing), from LG's gallery
// photos of this model (front, side, open, stocked, rear): freezer on top (81 L) with a brushed-steel Convertible plate, one glass
// shelf and a manual ice maker (lever and two trays); fridge below (262 L) with a pull-out Fresh 0 Zone tray, a round temperature
// plate, three tempered-glass shelves and a large Fresh Zone drawer; 2 baskets in the freezer door and 4 in the fridge door; both
// doors hinged on the right; a black pocket grip across the top of the fridge door instead of handles.
// Stocked for a south Indian kitchen. usage: node make_lg_glt3426.mjs <products.json> <tex dir> <out.glb>
import fs from "node:fs";
import { THREE, mat, mesh, box, faced, group, flipV, stateClips, exportGLB, productParts, saveZones } from "./lib.mjs";

const [PRODUCTS, TEX, OUT] = process.argv.slice(2);
const ID = "lg-glt3426snpz";
const T = `${TEX}/lg_glt3426`;

// ── size (metres) ──
const W = 0.600, H = 1.720, D = 0.710;
const doorT = 0.045, Dc = D - doorT;
const zBack = -D / 2, zFront = zBack + Dc;
const wall = 0.036, feet = 0.022;
const inW = W - 2 * wall, zIn1 = zBack + 0.06, inD = zFront - zIn1;
// vertical layout (measured on LG's photos, see NOTES): freezer cavity, mullion with the grip, fridge cavity
const fy0 = 1.192, fy1 = H - 0.07;          // freezer cavity floor and ceiling
const gy0 = 0.106, gy1 = 1.132;               // fridge cavity floor and ceiling
const fzBot = 1.185;                         // freezer door bottom edge
const frTop = 1.178, frLow = 0.028;          // fridge door top (with its lip) and bottom
const bandTop = 1.169, bandBot = 1.141;      // the black pocket grip

// ── materials ──
const steelDoorF = mat("DoorFreezer", 0xd6d6d6, { metal: 0.38, rough: 0.5 });
const steelDoorR = mat("DoorFridge", 0xd6d6d6, { metal: 0.38, rough: 0.5 });
const sideSteel = mat("SideSteel", 0xd2d2d2, { metal: 0.38, rough: 0.5 });
const sideSteelL = mat("SideSteelL", 0xd2d2d2, { metal: 0.38, rough: 0.5 });
const steelEdge = mat("SteelEdge", 0x9a9b9d, { metal: 0.2, rough: 0.6 });
const topSteel = mat("TopSteel", 0x7e8083, { metal: 0.15, rough: 0.7 });
const black = mat("GripBlack", 0x151516, { rough: 0.5 });
const silverLip = mat("SilverLip", 0xb4b5b7, { metal: 0.8, rough: 0.3 });
const labelM = mat("LabelBEE", 0xffffff, { rough: 0.5, opacity: 0.999 });
const logoM = mat("LgMark", 0xffffff, { rough: 0.5, opacity: 0.999 });
const rearM = mat("RearPlate", 0xffffff, { metal: 0.3, rough: 0.55 });
const liner = mat("Liner", 0xf1f3f5, { rough: 0.6 });
const linerSide = mat("LinerSide", 0xe4e8ec, { rough: 0.65 });
const linerDk = mat("LinerGrey", 0xcfd3d8, { rough: 0.6 });
const gasket = mat("Gasket", 0x6c7176, { rough: 0.85 });
const plinth = mat("Plinth", 0x1a1b1d, { rough: 0.8 });
const clear = mat("ClearPlastic", 0xc3d0da, { rough: 0.12, opacity: 0.5, side: THREE.DoubleSide });
const clearLight = mat("ClearPlasticLight", 0xdfe7ee, { rough: 0.12, opacity: 0.26, side: THREE.DoubleSide });
const clearRib = mat("ClearRib", 0xffffff, { rough: 0.3, opacity: 0.92 });
const glass = mat("TemperedGlass", 0xa9cdd6, { rough: 0.05, opacity: 0.55, side: THREE.DoubleSide });
const glassRim = mat("ShelfRim", 0xe3e7ea, { rough: 0.45 });
const edgeGreen = mat("GlassEdge", 0x7fa7b0, { rough: 0.3 });
const white = mat("WhitePlastic", 0xf6f7f8, { rough: 0.45 });
const wire = mat("WireGrey", 0x4a4d52, { metal: 0.6, rough: 0.4 });
const ice = mat("IceCube", 0xe3f4ff, { rough: 0.08, opacity: 0.72 });
const lightM = mat("Led", 0xffffff, { emissive: 0xf4f8ff, emissiveIntensity: 1.5 });
const footM = mat("Foot", 0x131416, { rough: 0.7 });
const cordM = mat("Cord", 0x5d6064, { rough: 0.6 });
const plugM = mat("Plug", 0x45474b, { rough: 0.5 });
const pinM = mat("Pin", 0xb7bbc0, { metal: 0.9, rough: 0.3 });
const hingeM = mat("Hinge", 0xc9ccd0, { metal: 0.9, rough: 0.3 });
const knobM = mat("KnobFace", 0xffffff, { rough: 0.5 });
const knobSide = mat("KnobSide", 0xe6e8eb, { rough: 0.5 });
const plateConv = mat("PlateConvertible", 0xffffff, { metal: 0.5, rough: 0.4 });
const plateCtrl = mat("PlateControl", 0xffffff, { metal: 0.5, rough: 0.4 });
const printF0 = mat("print_fresh0", 0xffffff, { rough: 0.6, opacity: 0.999 });
const printPull = mat("print_pullout", 0xffffff, { rough: 0.6, opacity: 0.999 });
const printFz = mat("print_freshzone", 0xffffff, { rough: 0.6, opacity: 0.999 });
// food, kitchenware
const F = {
  egg: mat("Egg", 0xd9b98c, { rough: 0.55 }), eggCream: mat("EggCream", 0xe9d8b8, { rough: 0.55 }),
  tubWhite: mat("TubWhite", 0xf7f7f4, { rough: 0.5 }), lidBlue: mat("LidBlue", 0x2f6fb4, { rough: 0.4 }), lidWhite: mat("LidWhite", 0xe9ebee, { rough: 0.5 }),
  steel: mat("KitchenSteel", 0xc4c8cc, { metal: 0.95, rough: 0.28 }), steelDark: mat("KitchenSteelDark", 0x8e9296, { metal: 0.9, rough: 0.35 }),
  amber: mat("GlassAmber", 0xc9892b, { rough: 0.12, opacity: 0.88 }), goldLid: mat("GoldLid", 0xd1a43a, { metal: 0.8, rough: 0.3 }),
  brownGlass: mat("GlassBrown", 0x4a2a16, { rough: 0.12, opacity: 0.94 }), redGlass: mat("GlassRed", 0x992c20, { rough: 0.15, opacity: 0.92 }),
  waterBottle: mat("WaterBottle", 0xcfe9f7, { rough: 0.1, opacity: 0.55 }), waterCap: mat("WaterCap", 0x2f6fb4, { rough: 0.4 }),
  cola: mat("ColaLiquid", 0x3a1f10, { rough: 0.15, opacity: 0.93 }), colaCap: mat("ColaCap", 0xc42b22, { rough: 0.4 }),
  canRed: mat("CanRed", 0xb82a20, { metal: 0.25, rough: 0.4 }), canGreen: mat("CanGreen", 0x218a40, { metal: 0.25, rough: 0.4 }), canGold: mat("CanGold", 0xd89a1f, { metal: 0.25, rough: 0.4 }), canOrange: mat("CanOrange", 0xe07a12, { metal: 0.25, rough: 0.4 }), canBlack: mat("CanBlack", 0x1a1a1e, { metal: 0.25, rough: 0.4 }), fanta: mat("FantaLiquid", 0xe8820e, { rough: 0.15, opacity: 0.93 }), fantaCap: mat("FantaCap", 0xe07a12, { rough: 0.4 }),
  carrot: mat("Carrot", 0xe8791f, { rough: 0.55 }), drumstick: mat("Drumstick", 0x5e7f3a, { rough: 0.6 }), brinjal: mat("Brinjal", 0x4a2255, { rough: 0.3 }),
  okra: mat("LadiesFinger", 0x6aa23a, { rough: 0.55 }), tomato: mat("Tomato", 0xc9372c, { rough: 0.4 }), chilli: mat("GreenChilli", 0x3f8a2a, { rough: 0.45 }),
  leaf: mat("CurryLeaf", 0x2f7a2d, { rough: 0.6 }), coriander: mat("Coriander", 0x5aa543, { rough: 0.65 }), banana: mat("Banana", 0xe8c93a, { rough: 0.5 }),
  coconutShell: mat("CoconutShell", 0x6b4426, { rough: 0.8 }), coconutFlesh: mat("CoconutFlesh", 0xf6f3ea, { rough: 0.5 }),
  lemon: mat("Lemon", 0xe9d63a, { rough: 0.5 }), onion: mat("Onion", 0x9e4a63, { rough: 0.5 }),
  butter: mat("ButterWrap", 0xffd24a, { rough: 0.5 }), cheese: mat("CheeseBlock", 0xf1c765, { rough: 0.5 }), cupWhite: mat("CurdCup", 0xf4f6f8, { rough: 0.5 }),
  sachet: mat("MilkSachet", 0xe8f1fb, { rough: 0.35 }), sachetCurd: mat("CurdSachet", 0xd2e4f7, { rough: 0.35 }),
  coconutPack: mat("GratedCoconutPack", 0xf1f3f6, { rough: 0.4 }), icecream: mat("IceCreamTub", 0x7b4528, { rough: 0.5 }),
  meat: mat("MeatPack", 0xc94a4a, { rough: 0.4 }), soup: mat("SambarVessel", 0xb26a22, { rough: 0.45 }),
};
const labelMats = {};
const lbl = (name) => (labelMats[name] ||= mat(name, 0xffffff, { rough: 0.5 }));

// ── small builders ──
const cyl = (name, rt, rb, h, m, x, y, z, seg = 12) => mesh(name, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
const sph = (name, r, m, x, y, z, sx = 1, sy = 1, sz = 1, seg = 9) => { const o = mesh(name, new THREE.SphereGeometry(r, seg, Math.max(5, Math.round(seg * 0.7))), m, x, y, z); o.scale.set(sx, sy, sz); return o; };
// a printed label wrapped round a cylinder's front (arc in radians), so it follows the curve instead of cutting through it
function band(name, r, h, arc, m, x, y, z) {
  const g = new THREE.CylinderGeometry(r + 0.0009, r + 0.0009, h, 18, 1, true, -arc / 2, arc);
  return mesh(name, flipV(g), m, x, y, z);
}
const plane = (name, w, h, m, x, y, z) => mesh(name, flipV(new THREE.PlaneGeometry(w, h)), m, x, y, z);
// a stocked tub with a printed label on its front
function tub(name, r, h, bodyM, lidM, labelName, x, y, z) {
  const g = group(name, x, y, z);
  g.add(cyl(name + "Body", r, r * 0.92, h, bodyM, 0, h / 2, 0, 14));
  g.add(cyl(name + "Lid", r * 1.03, r * 1.03, 0.012, lidM, 0, h + 0.006, 0, 14));
  if (labelName) g.add(band(name + "Label", r * 0.96, h * 0.6, 1.9, lbl(labelName), 0, h * 0.5, 0));
  return g;
}
function jar(name, r, h, glassM, lidM, labelName, x, y, z) {
  const g = group(name, x, y, z);
  g.add(cyl(name + "Glass", r, r, h, glassM, 0, h / 2, 0, 14));
  g.add(cyl(name + "Lid", r * 1.02, r * 1.02, 0.014, lidM, 0, h + 0.007, 0, 14));
  if (labelName) g.add(band(name + "Label", r, h * 0.55, 1.9, lbl(labelName), 0, h * 0.5, 0));
  return g;
}
function bottle(name, r, h, liquidM, capM, x, y, z) {
  const g = group(name, x, y, z);
  g.add(cyl(name + "Body", r, r, h * 0.7, liquidM, 0, h * 0.35, 0, 16));
  g.add(cyl(name + "Shoulder", r * 0.38, r, h * 0.18, liquidM, 0, h * 0.79, 0, 16));
  g.add(cyl(name + "Neck", r * 0.38, r * 0.38, h * 0.08, liquidM, 0, h * 0.92, 0, 12));
  g.add(cyl(name + "Cap", r * 0.42, r * 0.42, h * 0.05, capM, 0, h * 0.975, 0, 12));
  return g;
}
const can = (name, m, x, y, z) => { const g = group(name, x, y, z); g.add(cyl(name + "Body", 0.0333, 0.0333, 0.122, m, 0, 0.061, 0, 14)); g.add(cyl(name + "Top", 0.0285, 0.0333, 0.008, F.steel, 0, 0.126, 0, 14)); return g; };
// a sachet: a flat pillow of milk or curd lying down, with its printed face up
function sachet(name, m, labelName, x, y, z, rotY = 0) {
  const g = group(name, x, y, z); g.rotation.y = rotY;
  g.add(mesh(name + "Body", new THREE.BoxGeometry(0.15, 0.028, 0.105), m, 0, 0.014, 0));
  g.add(plane(name + "Label", 0.11, 0.07, lbl(labelName), 0, 0.0285, 0).rotateX(-Math.PI / 2));
  return g;
}
function egg(name, x, y, z) { const e = sph(name, 0.0215, F.egg, x, y, z, 1, 1.28, 1); return e; }
function basket(name, w, dep, h, y, front = true) { // a clear door basket, open at the top; origin at its floor
  const g = group(name, 0, y, 0);
  g.add(box(name + "Floor", w, 0.004, dep, clear, 0, 0.002, -dep / 2));
  g.add(box(name + "Back", w, h, 0.004, clear, 0, h / 2, -0.002));
  if (front) g.add(box(name + "Lip", w, h * 0.85, 0.004, clear, 0, h * 0.425, -dep + 0.002));
  g.add(box(name + "EndL", 0.004, h, dep, clear, -w / 2 + 0.002, h / 2, -dep / 2));
  g.add(box(name + "EndR", 0.004, h, dep, clear, w / 2 - 0.002, h / 2, -dep / 2));
  g.add(box(name + "Rim", w, 0.006, 0.006, clearRib, 0, h - 0.003, -dep + 0.003));
  return g;
}

const root = group("LGGLT3426");
const cab = group("Cabinet");
root.add(cab);

// ── cabinet shell ──
const sideH = H - feet, sideMid = feet + sideH / 2, zMid = zBack + Dc / 2;
cab.add(mesh("SideLeft", flipV(new THREE.BoxGeometry(wall, sideH, Dc)), [linerSide, sideSteelL, topSteel, plinth, sideSteelL, sideSteelL], -W / 2 + wall / 2, sideMid, zMid));
cab.add(mesh("SideRight", flipV(new THREE.BoxGeometry(wall, sideH, Dc)), [sideSteel, linerSide, topSteel, plinth, sideSteel, sideSteel], W / 2 - wall / 2, sideMid, zMid));
cab.add(faced("Top", inW, 0.045, Dc, [topSteel, topSteel, topSteel, liner, topSteel, topSteel], 0, H - 0.0225, zMid));
cab.add(faced("Divider", inW, fy0 - gy1, inD, [liner, liner, liner, liner, liner, liner], 0, (fy0 + gy1) / 2, zIn1 + inD / 2));
cab.add(faced("Base", inW, gy0 - feet, Dc, [liner, liner, liner, liner, liner, liner], 0, feet + (gy0 - feet) / 2, zMid));
cab.add(box("Kickplate", inW, 0.026, 0.012, plinth, 0, feet + 0.013, zFront - 0.006));
cab.add(faced("BackFreezer", inW, fy1 - fy0, 0.012, [linerDk, linerDk, linerDk, linerDk, linerDk, linerDk], 0, (fy0 + fy1) / 2, zIn1 + 0.006));
cab.add(faced("BackFridge", inW, gy1 - gy0, 0.012, [liner, liner, liner, liner, liner, liner], 0, (gy0 + gy1) / 2, zIn1 + 0.006));
// the real back: LG's rear photo on a thin plate; the compressor bay is in the photo
{
  const rh = H - 0.075, ry = 0.075 + rh / 2;
  cab.add(mesh("RearPlate", flipV(new THREE.BoxGeometry(W, rh, 0.004)), [steelEdge, steelEdge, steelEdge, steelEdge, steelEdge, rearM], 0, ry, zBack + 0.002));
}
// feet: two adjustable at the front, two rollers at the back
for (const fx of [-1, 1]) {
  cab.add(cyl("FootFront", 0.016, 0.018, feet, footM, fx * (W / 2 - 0.04), feet / 2, zFront - 0.05));
  cab.add(cyl("Roller", 0.017, 0.017, 0.018, footM, fx * (W / 2 - 0.04), 0.017, zBack + 0.06).rotateZ(Math.PI / 2));
}
// hinge on the right: a bright block between the doors, and a dark cover on top
cab.add(box("HingeMid", 0.034, 0.05, 0.018, hingeM, W / 2 - 0.02, (fzBot + frTop) / 2 + 0.002, zFront + 0.006));
cab.add(box("HingeCoverTop", 0.07, 0.01, 0.045, plinth, W / 2 - 0.045, H - 0.005, zFront - 0.02));
// power cord and its three-pin plug at the back (route and sizes estimated from the photo)
{
  const pts = [[-0.205, 0.44], [-0.222, 0.35], [-0.215, 0.24], [-0.17, 0.17], [-0.1, 0.12], [-0.02, 0.105]].map(([x, y]) => new THREE.Vector3(x, y, zBack - 0.006));
  cab.add(mesh("PowerCord", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), 90, 0.004, 6, false), cordM));
  const sh = new THREE.Shape(), w = 0.045, h = 0.042, r = 0.012;
  sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2);
  sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const plug = mesh("Plug", new THREE.ExtrudeGeometry(sh, { depth: 0.016, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2, curveSegments: 8 }), plugM, -0.01, 0.105, zBack - 0.006);
  plug.rotation.y = Math.PI;
  cab.add(plug);
  for (const [dx, dy] of [[0, 0.0105], [-0.0095, -0.0065], [0.0095, -0.0065]]) {
    const pin = cyl("PlugPin", 0.0026, 0.0026, 0.016, pinM, -0.01 + dx, 0.105 + dy, zBack - 0.006 - 0.016 - 0.008, 10);
    pin.rotation.x = Math.PI / 2; cab.add(pin);
  }
}

// ── freezer inside ──
const xL = -inW / 2, xR = inW / 2;
cab.add(box("FreezerLedL", 0.1, 0.006, 0.014, lightM, -0.1, fy1 - 0.006, zIn1 + 0.05));
cab.add(box("FreezerLedR", 0.1, 0.006, 0.014, lightM, 0.1, fy1 - 0.006, zIn1 + 0.05));
// cold-air grilles at the bottom of the back wall
for (let i = 0; i < 5; i++) cab.add(box("FreezerVent", 0.09, 0.004, 0.008, plinth, 0.085, fy0 + 0.014 + i * 0.012, zIn1 + 0.0145));
// the brushed-steel Convertible plate on the back wall (LG prints the word on it)
cab.add(plane("PlateConvertible", 0.166, 0.077, plateConv, -0.06, 1.485, zIn1 + 0.0125));
// freezer glass shelf across the cavity, with a metal front rail
{
  const y = 1.392, g = group("FreezerShelf", 0, y, 0), bd = inD - 0.06;
  g.add(box("FzShelfGlass", inW - 0.012, 0.005, bd, glass, 0, 0, zIn1 + bd / 2 + 0.02));
  g.add(box("FzShelfRimF", inW - 0.008, 0.012, 0.01, glassRim, 0, 0.004, zFront - 0.04));
  g.add(box("FzShelfRimB", inW - 0.008, 0.01, 0.008, glassRim, 0, 0.003, zIn1 + 0.03));
  g.add(box("FzShelfRailL", 0.008, 0.012, bd, glassRim, xL + 0.01, 0.003, zIn1 + bd / 2 + 0.02));
  g.add(box("FzShelfRailR", 0.008, 0.012, bd, glassRim, xR - 0.01, 0.003, zIn1 + bd / 2 + 0.02));
  cab.add(g);
}
// the ice maker's housing: a white frame the tray and bucket slide in and out of
const icX = -0.18, icW = 0.17, icZ = zFront - 0.04, icDY = 0.03;
cab.add(box("IceHousingTop", icW + 0.01, 0.006, 0.2, white, icX, 1.317 + icDY, icZ - 0.1));
cab.add(box("IceHousingSideL", 0.005, 0.14, 0.2, white, icX - icW / 2 - 0.0025, 1.247 + icDY, icZ - 0.1));
cab.add(box("IceHousingSideR", 0.005, 0.14, 0.2, white, icX + icW / 2 + 0.0025, 1.247 + icDY, icZ - 0.1));

// ── fridge inside ──
cab.add(box("FridgeLed", 0.2, 0.006, 0.016, lightM, 0, gy1 - 0.006, zFront - 0.15));
// Fresh 0 Zone: a pull-out tray at the top, a clear box on side rails with LG's printed words on its lip
{
  const g = group("Fresh0Zone", 0, 1.003, 0), bw = inW - 0.012, bd = 0.37, bh = 0.125, zc = zIn1 + bd / 2 + 0.012;
  g.add(box("F0Floor", bw, 0.004, bd, clear, 0, 0, zc));
  g.add(box("F0Back", bw, bh, 0.004, clearLight, 0, bh / 2, zIn1 + 0.014));
  g.add(box("F0SideL", 0.004, bh, bd, clear, -bw / 2, bh / 2, zc));
  g.add(box("F0SideR", 0.004, bh, bd, clear, bw / 2, bh / 2, zc));
  g.add(box("F0FrontLow", bw, 0.05, 0.004, clearLight, 0, 0.025, zc + bd / 2));
  g.add(box("F0FrontHigh", bw - 0.02, 0.07, 0.004, clearLight, 0, 0.09, zc + bd / 2 - 0.004));
  g.add(box("F0Rim", bw, 0.008, 0.01, clearRib, 0, bh - 0.003, zc + bd / 2 - 0.004));
  g.add(box("F0Handle", 0.18, 0.012, 0.014, clearRib, 0, 0.05, zc + bd / 2 + 0.006));
  g.add(plane("PrintFresh0", 0.17, 0.0378, printF0, 0, 0.1, zc + bd / 2 - 0.0015));
  g.add(plane("PrintPullout", 0.17, 0.0227, printPull, 0, 0.025, zc + bd / 2 + 0.0023));
  cab.add(g);
  // butter, paneer, curd cups and a cheese block on its floor
  const s = group("F0Stock", 0, 1.007, zc + 0.03);
  s.add(box("Butter1", 0.09, 0.03, 0.05, F.butter, -0.19, 0.015, -0.04));
  s.add(box("Butter2", 0.09, 0.03, 0.05, F.butter, -0.19, 0.015, 0.05));
  s.add(plane("ButterLabel", 0.07, 0.035, lbl("lbl_butter"), -0.19, 0.0305, 0.05).rotateX(-Math.PI / 2));
  s.add(box("Paneer", 0.1, 0.05, 0.12, F.coconutFlesh, -0.05, 0.025, -0.02));
  s.add(plane("PaneerLabel", 0.075, 0.04, lbl("lbl_paneer"), -0.05, 0.0505, -0.02).rotateX(-Math.PI / 2));
  for (const [cx, cz] of [[0.07, -0.05], [0.115, -0.05], [0.07, 0.02], [0.115, 0.02]]) s.add(cyl("CurdCup", 0.026, 0.021, 0.05, F.cupWhite, cx, 0.025, cz));
  s.add(box("Cheese", 0.08, 0.035, 0.07, F.cheese, 0.2, 0.0175, 0.04));
  cab.add(s);
}
// the round temperature plate on the back wall
cab.add(plane("PlateControl", 0.162, 0.072, plateCtrl, -0.04, 0.905, zIn1 + 0.0125));
// three tempered-glass shelves with white rims, and the Fresh Zone drawer
function shelf(name, y) {
  const g = group(name, 0, y, 0), bd = inD - 0.05;
  g.add(box(name + "Glass", inW - 0.01, 0.006, bd, glass, 0, 0, zIn1 + bd / 2 + 0.014));
  g.add(box(name + "Rim", inW - 0.01, 0.014, 0.012, glassRim, 0, 0.004, zFront - 0.036));
  g.add(box(name + "Edge", inW - 0.01, 0.004, 0.003, edgeGreen, 0, -0.002, zFront - 0.029));
  g.add(box(name + "RimBack", inW - 0.01, 0.01, 0.01, glassRim, 0, 0.002, zIn1 + 0.02));
  g.add(box(name + "RailL", 0.01, 0.014, bd, glassRim, xL + 0.012, 0, zIn1 + bd / 2 + 0.014));
  g.add(box(name + "RailR", 0.01, 0.014, bd, glassRim, xR - 0.012, 0, zIn1 + bd / 2 + 0.014));
  cab.add(g);
}
shelf("Shelf1", 0.785);
shelf("Shelf2", 0.690);
shelf("Shelf3", 0.585);
{ // Fresh Zone: a glass cover over a big clear drawer with LG's printed words on its front
  const g = group("FreshZone", 0, 0, 0), bd = inD - 0.08, bw = inW - 0.02, zc = zIn1 + bd / 2 + 0.016;
  g.add(box("FzGlassCover", inW - 0.01, 0.006, bd, glass, 0, 0.438, zc));
  g.add(box("FzCoverRim", inW - 0.01, 0.012, 0.012, glassRim, 0, 0.441, zFront - 0.05));
  g.add(box("FzBoxFloor", bw, 0.004, bd, clear, 0, 0.19, zc));
  g.add(box("FzBoxBack", bw, 0.23, 0.004, clear, 0, 0.305, zIn1 + 0.018));
  g.add(box("FzBoxL", 0.004, 0.23, bd, clear, -bw / 2, 0.305, zc));
  g.add(box("FzBoxR", 0.004, 0.23, bd, clear, bw / 2, 0.305, zc));
  g.add(box("FzBoxFront", bw, 0.23, 0.004, clearLight, 0, 0.305, zc + bd / 2));
  g.add(box("FzBoxRim", bw, 0.008, 0.008, clearRib, 0, 0.42, zc + bd / 2));
  g.add(box("FzBoxFootRim", bw, 0.008, 0.008, clearRib, 0, 0.193, zc + bd / 2));
  g.add(plane("PrintFreshZone", 0.17, 0.0442, printFz, 0, 0.3, zc + bd / 2 + 0.0023));
  cab.add(g);
}

// ── stock on the shelves (south Indian kitchen) ──
{
  const s1 = group("Shelf1Stock", 0, 0.788, 0), z0 = zIn1 + 0.19;
  // steel tiffin carrier: three stacked containers, a frame and clip
  // clear lock-boxes with food, as on LG's own stocked photo: idlis, rice, chutney, cut fruit
  function lockbox(name, w, d, h, food, x, y, z) {
    const g = group(name, x, y, z);
    g.add(box(name + "Body", w, h, d, clearLight, 0, h / 2, 0));
    g.add(box(name + "Food", w - 0.012, h * 0.55, d - 0.012, food, 0, h * 0.3, 0));
    g.add(box(name + "Lid", w + 0.004, 0.008, d + 0.004, F.lidBlue, 0, h + 0.004, 0));
    return g;
  }
  s1.add(lockbox("IdliBox", 0.115, 0.09, 0.045, F.cupWhite, -0.185, 0, z0 + 0.04));
  s1.add(lockbox("RiceBox", 0.115, 0.09, 0.045, F.coconutFlesh, -0.185, 0.054, z0 + 0.04));
  s1.add(lockbox("ChutneyBox", 0.115, 0.09, 0.045, F.coriander, -0.185, 0, z0 + 0.15));
  s1.add(lockbox("SaladBox", 0.115, 0.09, 0.045, F.tomato, -0.185, 0.054, z0 + 0.15));
  s1.add(tub("IdliBatterTub", 0.05, 0.09, F.tubWhite, F.lidBlue, "lbl_idli", -0.08, 0, z0 + 0.13));
  s1.add(tub("DosaBatterTub", 0.05, 0.09, F.tubWhite, F.lidBlue, "lbl_dosa", 0.015, 0, z0 + 0.13));
  s1.add(tub("CurdTub", 0.05, 0.075, F.tubWhite, F.lidWhite, "lbl_curd", 0.105, 0, z0 + 0.155));
  s1.add(jar("ChutneyJar", 0.034, 0.085, F.coconutFlesh, F.lidBlue, null, 0.2, 0, z0 + 0.15));
  s1.add(cyl("SambarVessel", 0.065, 0.06, 0.09, F.steel, 0.07, 0, z0 + 0.02).translateY(0.045));
  s1.add(cyl("SambarSurface", 0.058, 0.058, 0.004, F.soup, 0.07, 0.088, z0 + 0.02));
  s1.add(plane("SambarLabel", 0.07, 0.035, lbl("lbl_sambar"), 0.07, 0.0925, z0 + 0.02).rotateX(-Math.PI / 2));
  cab.add(s1);
  const s2 = group("Shelf2Stock", 0, 0.693, 0);
  const t = group("Tiffin", 0.17, 0, z0 + 0.1);
  for (let i = 0; i < 3; i++) { t.add(cyl("TiffinTier", 0.062, 0.062, 0.042, F.steel, 0, 0.017 + i * 0.035, 0, 14)); t.add(cyl("TiffinRim", 0.064, 0.064, 0.004, F.steelDark, 0, 0.035 + i * 0.035, 0, 14)); }
  t.add(cyl("TiffinKnob", 0.01, 0.01, 0.014, F.steelDark, 0, 0.11, 0));
  t.add(box("TiffinBarL", 0.004, 0.14, 0.004, F.steelDark, -0.067, 0.07, 0)); t.add(box("TiffinBarR", 0.004, 0.112, 0.004, F.steelDark, 0.067, 0.056, 0));
  s2.add(t);

  for (const [cx, rot] of [[-0.12, 0], [0.0, Math.PI]]) { // two coconut halves, flesh up
    const c = group("CoconutHalf", cx, 0, z0 + 0.05); c.rotation.y = rot;
    c.add(sph("CoconutShell", 0.062, F.coconutShell, 0, 0.0, 0, 1, 0.75, 1, 18));
    c.add(cyl("CoconutFlesh", 0.054, 0.054, 0.004, F.coconutFlesh, 0, 0.0455, 0, 14));
    s2.add(c);
  }
  { const m = group("WatermelonHalf", -0.2, 0, z0 + 0.17); m.add(sph("MelonRind", 0.07, mat("MelonRind", 0x2f7a3a, { rough: 0.5 }), 0, 0.0, 0, 1, 0.8, 1, 20)); m.add(cyl("MelonFlesh", 0.066, 0.066, 0.004, mat("MelonFlesh", 0xd9344a, { rough: 0.35 }), 0, 0.0555, 0, 14)); s2.add(m); }
  s2.add(cyl("MilkPot", 0.062, 0.06, 0.09, F.steel, -0.02, 0.045, z0 - 0.01));
  s2.add(cyl("MilkPotLid", 0.064, 0.064, 0.008, F.steelDark, -0.02, 0.094, z0 - 0.01));
  s2.add(cyl("MilkPotKnob", 0.01, 0.01, 0.012, F.steelDark, -0.02, 0.104, z0 - 0.01));
  s2.add(cyl("CurdRiceBowl", 0.07, 0.045, 0.06, F.cupWhite, 0.0, 0.03, z0 + 0.2));
  s2.add(cyl("CurdRiceFill", 0.062, 0.062, 0.004, F.coconutFlesh, 0.0, 0.062, z0 + 0.2));
  cab.add(s2);
  const s3 = group("Shelf3Stock", 0, 0.588, 0);
  for (const [x, z] of [[-0.18, 0.1], [-0.06, 0.1], [0.06, 0.1]]) { s3.add(cyl("LockTub", 0.05, 0.05, 0.075, clearLight, x, 0.0375, z0 + z, 14)); s3.add(cyl("LockTubFood", 0.045, 0.045, 0.04, [F.carrot, F.coriander, F.tomato][x < -0.1 ? 0 : x < 0 ? 1 : 2], x, 0.025, z0 + z, 14)); s3.add(cyl("LockTubLid", 0.052, 0.052, 0.008, F.lidBlue, x, 0.079, z0 + z, 14)); }
  // a bunch of bananas lying on the shelf
  for (let i = 0; i < 5; i++) { const b = sph("Banana", 0.018, F.banana, 0.12 + i * 0.012, 0.02 + i * 0.001, z0 + 0.04 + i * 0.016, 3.2, 0.8, 0.8, 10); b.rotation.y = 0.25; b.rotation.z = 0.12 - i * 0.04; s3.add(b); }
  s3.add(mesh("LemonNet", new THREE.SphereGeometry(0.04, 12, 8), F.lemon, 0.06, 0.03, z0 + 0.2));
  for (const [lx, lz] of [[0.02, 0.2], [0.09, 0.22], [0.14, 0.2], [0.18, 0.15]]) s3.add(sph("Lemon", 0.022, F.lemon, lx, 0.02, z0 + lz, 1.15, 0.9, 1));
  s3.add(cyl("CurdRiceBowl2", 0.07, 0.045, 0.06, F.cupWhite, -0.17, 0.03, z0 + 0.12));
  s3.add(cyl("CurdRiceFill2", 0.062, 0.062, 0.004, F.coconutFlesh, -0.17, 0.062, z0 + 0.12));
  cab.add(s3);
  // Fresh Zone: south Indian vegetables
  const v = group("FreshZoneStock", 0, 0.194, 0), zv = zIn1 + 0.05;
  for (let i = 0; i < 5; i++) { const c = cyl("Carrot", 0.0, 0.016, 0.16, F.carrot, -0.17 + i * 0.018, 0.02 + (i % 2) * 0.012, zv + 0.12 + i * 0.01, 10); c.rotation.x = Math.PI / 2; c.rotation.z = 0.05 * (i - 2); v.add(c); }
  for (let i = 0; i < 4; i++) { const d = cyl("Drumstick", 0.008, 0.008, 0.3, F.drumstick, -0.08 + i * 0.02, 0.02 + (i % 2) * 0.014, zv + 0.15, 8); d.rotation.x = Math.PI / 2; d.rotation.z = 0.03 * (i - 1.5); v.add(d); }
  for (let i = 0; i < 3; i++) v.add(sph("Brinjal", 0.03, F.brinjal, 0.04 + i * 0.058, 0.032, zv + 0.06 + (i % 2) * 0.05, 1, 1, 1.9));
  for (let i = 0; i < 9; i++) { const o = cyl("LadiesFinger", 0.0, 0.009, 0.075, F.okra, 0.12 + (i % 3) * 0.018, 0.012 + Math.floor(i / 3) * 0.014, zv + 0.12 + (i % 3) * 0.012, 6); o.rotation.x = Math.PI / 2; o.rotation.z = 0.2; v.add(o); }
  for (let i = 0; i < 5; i++) v.add(sph("Tomato", 0.026, F.tomato, 0.14 + (i % 3) * 0.05, 0.03, zv + 0.28 + Math.floor(i / 3) * 0.05));
  for (let i = 0; i < 6; i++) v.add(sph("Onion", 0.03, F.onion, -0.18 + (i % 3) * 0.06, 0.03, zv + 0.3 + Math.floor(i / 3) * 0.055));
  for (let i = 0; i < 8; i++) { const c = cyl("GreenChilli", 0.0, 0.004, 0.06, F.chilli, -0.02 + i * 0.006, 0.01 + (i % 2) * 0.006, zv + 0.3, 5); c.rotation.x = Math.PI / 2; c.rotation.z = 0.5 - i * 0.12; v.add(c); }
  for (let i = 0; i < 14; i++) v.add(sph("CurryLeaf", 0.014, F.leaf, 0.1 + (i % 5) * 0.012, 0.045 + (i % 3) * 0.012, zv + 0.12 + Math.floor(i / 5) * 0.014, 1.6, 0.25, 1, 8));
  for (let i = 0; i < 10; i++) v.add(sph("Coriander", 0.02, F.coriander, -0.2 + (i % 5) * 0.012, 0.045 + (i % 2) * 0.015, zv + 0.05 + Math.floor(i / 5) * 0.02, 1.3, 0.35, 1.3, 8));
  cab.add(v);
}

// ── freezer stock ──
{
  const f = group("FreezerStock", 0, fy0 + 0.002, 0), zf = zIn1 + 0.17;
  f.add(tub("IceCreamTub1", 0.07, 0.068, F.icecream, F.icecream, "lbl_icecream", -0.135, 0, zf));
  f.add(tub("IceCreamTub2", 0.07, 0.068, F.cupWhite, F.cupWhite, "lbl_icecream2", -0.135, 0.082, zf));
  f.add(box("MeatPack", 0.1, 0.03, 0.13, F.meat, -0.02, 0.015, zIn1 + 0.1));
  cab.add(f);
  const top = group("OnFreezerShelf", 0, 1.397, 0);
  top.add(box("PeasPack", 0.13, 0.035, 0.17, F.chilli, -0.17, 0.0175, zIn1 + 0.15));
  top.add(plane("PeasLabel", 0.1, 0.075, lbl("lbl_peas"), -0.17, 0.0355, zIn1 + 0.15).rotateX(-Math.PI / 2));
  top.add(box("ParottaPack", 0.14, 0.04, 0.17, F.butter, -0.03, 0.02, zIn1 + 0.16));
  top.add(plane("ParottaLabel", 0.11, 0.08, lbl("lbl_parotta"), -0.03, 0.0405, zIn1 + 0.16).rotateX(-Math.PI / 2));
  top.add(box("CoconutGratedPack", 0.12, 0.034, 0.15, F.coconutPack, 0.12, 0.017, zIn1 + 0.14));
  cab.add(top);
}

// ── ice maker: the tray unit and the bucket slide out together (a real part) ──
const ic = group("IceMaker", icX, 0, icZ);
{
  ic.add(mesh("IceFace", new THREE.BoxGeometry(icW, 0.06, 0.03), white, 0, 1.288, -0.015));
  ic.add(box("IceFaceSlot", 0.08, 0.008, 0.004, plinth, 0, 1.304, 0.001));
  ic.add(box("IceFaceGrip", 0.08, 0.012, 0.01, white, 0, 1.272, 0.004));
  ic.add(box("IceTrayBody", icW - 0.012, 0.045, 0.17, white, 0, 1.29, -0.115));
  ic.add(box("IceBucketFloor", icW - 0.01, 0.004, 0.17, clear, 0, 1.18, -0.115));
  ic.add(box("IceBucketFront", icW - 0.01, 0.07, 0.004, clear, 0, 1.215, -0.032));
  ic.add(box("IceBucketL", 0.004, 0.07, 0.17, clear, -(icW - 0.01) / 2, 1.215, -0.115));
  ic.add(box("IceBucketR", 0.004, 0.07, 0.17, clear, (icW - 0.01) / 2, 1.215, -0.115));
  ic.add(box("IceBucketHandle", 0.07, 0.008, 0.01, clearRib, 0, 1.248, -0.028));
  const cube = new THREE.BoxGeometry(0.03, 0.025, 0.03);
  for (let i = 0; i < 16; i++) {
    const c = mesh("IceCube", cube, ice, -0.055 + (i % 4) * 0.037 + (Math.floor(i / 4) % 2) * 0.012, 1.196 + Math.floor(i / 8) * 0.024, -0.06 - Math.floor((i % 8) / 4) * 0.055 - (i % 3) * 0.012);
    c.rotation.set(0.2 * (i % 3), 0.5 * i, 0.15 * (i % 4));
    ic.add(c);
  }
}
cab.add(ic);
ic.position.y = icDY;     // the ice maker hangs under the freezer shelf

// ── doors: hinged on the right, no handles, black pocket grip on the fridge door ──
const pw = W - 0.004;
function doorShell(name, y0, h, parts) { const g = group(name, W / 2, y0, zFront); parts(g); return g; }
const freezerDoor = doorShell("FreezerDoor", fzBot, H - fzBot, (g) => {
  const h = H - fzBot;
  g.add(mesh("FzPanel", flipV(new THREE.BoxGeometry(pw, h, doorT)), [steelEdge, steelEdge, topSteel, steelEdge, steelDoorF, liner], -pw / 2, h / 2, doorT / 2));
  g.add(plane("LgMarkDecal", 0.054, 0.0248, logoM, -pw + 0.066, h - 0.051, doorT + 0.0006));
  g.add(plane("BeeLabelDecal", 0.0705, 0.1305, labelM, -0.043, h - 0.034 - 0.065, doorT + 0.0006));
  // inside: gasket frame, liner, two baskets
  g.add(box("FzGasketT", pw - 0.02, 0.014, 0.014, gasket, -pw / 2, h - 0.012, -0.007));
  g.add(box("FzGasketB", pw - 0.02, 0.014, 0.014, gasket, -pw / 2, 0.012, -0.007));
  g.add(box("FzGasketL", 0.014, h - 0.02, 0.014, gasket, -pw + 0.012, h / 2, -0.007));
  g.add(box("FzGasketR", 0.014, h - 0.02, 0.014, gasket, -0.012, h / 2, -0.007));
  g.add(box("FzLiner", pw - 0.05, h - 0.05, 0.012, liner, -pw / 2, h / 2, -0.004));
  const b1 = basket("FzBasket1", pw - 0.1, 0.07, 0.065, 0.31, true); b1.position.x = -pw / 2; g.add(b1);
  const b2 = basket("FzBasket2", pw - 0.1, 0.07, 0.065, 0.175, true); b2.position.x = -pw / 2; g.add(b2);
  // frozen grated coconut and parotta in the baskets (small packs)
  for (let i = 0; i < 4; i++) { g.add(box("FzPackA", 0.1, 0.05, 0.03, F.coconutPack, -0.12 - i * 0.13, 0.31 + 0.027, -0.04)); g.add(box("FzPackB", 0.1, 0.05, 0.03, i % 2 ? F.butter : F.chilli, -0.12 - i * 0.13, 0.175 + 0.027, -0.04)); }
});
const fridgeDoor = doorShell("FridgeDoor", frLow, frTop - frLow, (g) => {
  const h = frTop - frLow, lowH = bandBot - frLow, bandH = bandTop - bandBot, lipH = frTop - bandTop;
  g.add(mesh("FrPanelLow", flipV(new THREE.BoxGeometry(pw, lowH, doorT)), [steelEdge, steelEdge, steelEdge, steelEdge, steelDoorR, liner], -pw / 2, lowH / 2, doorT / 2));
  g.add(mesh("FrLip", new THREE.BoxGeometry(pw, lipH, doorT), [steelEdge, steelEdge, topSteel, steelEdge, silverLip, liner], -pw / 2, lowH + bandH + lipH / 2, doorT / 2));
  g.add(box("GripBand", pw - 0.02, bandH, doorT - 0.016, black, -pw / 2, lowH + bandH / 2, (doorT - 0.016) / 2));
  for (const sx of [-1, 1]) g.add(box("GripEnd", 0.012, bandH, doorT, black, -pw / 2 + sx * (pw / 2 - 0.006), lowH + bandH / 2, doorT / 2));
  // inside: gasket, liner, three baskets
  g.add(box("FrGasketT", pw - 0.02, 0.014, 0.014, gasket, -pw / 2, h - 0.012, -0.007));
  g.add(box("FrGasketB", pw - 0.02, 0.014, 0.014, gasket, -pw / 2, 0.012, -0.007));
  g.add(box("FrGasketL", 0.014, h - 0.02, 0.014, gasket, -pw + 0.012, h / 2, -0.007));
  g.add(box("FrGasketR", 0.014, h - 0.02, 0.014, gasket, -0.012, h / 2, -0.007));
  g.add(box("FrLiner", pw - 0.05, h - 0.05, 0.012, liner, -pw / 2, h / 2, -0.004));
  const eggY = 0.985 - frLow, jarY = 0.805 - frLow, botY = 0.455 - frLow, canY = 0.158 - frLow;
  const bE = basket("EggBasket", pw - 0.12, 0.075, 0.062, eggY, true); bE.position.x = -pw / 2; g.add(bE);
  const bJ = basket("JarBasket", pw - 0.12, 0.085, 0.085, jarY, true); bJ.position.x = -pw / 2; g.add(bJ);
  const bB = basket("BottleBasket", pw - 0.12, 0.095, 0.17, botY, true); bB.position.x = -pw / 2; g.add(bB);
  const bC = basket("CanBasket", pw - 0.12, 0.075, 0.115, canY, true); bC.position.x = -pw / 2; g.add(bC);
  // eggs: six in the egg basket's cups, and a jar of ghee at its end
  g.add(box("EggCupsRib", pw - 0.14, 0.006, 0.05, clearRib, -pw / 2, eggY + 0.006, -0.037));
  for (let i = 0; i < 6; i++) g.add(egg("Egg", -0.115 - i * 0.056, eggY + 0.034, -0.038));
  g.add(jar("GheeJar", 0.03, 0.075, F.amber, F.goldLid, "lbl_ghee", -0.47, eggY + 0.004, -0.04));
  // the middle basket: pickle, ghee, chutney and curd-rice jars
  g.add(jar("PickleJar", 0.032, 0.075, F.redGlass, F.goldLid, "lbl_pickle", -0.11, jarY + 0.004, -0.04));
  g.add(jar("ChutneyJar2", 0.034, 0.075, F.coconutFlesh, F.lidBlue, null, -0.19, jarY + 0.004, -0.04));
  g.add(jar("GheeJar2", 0.032, 0.075, F.amber, F.goldLid, "lbl_ghee", -0.27, jarY + 0.004, -0.04));
  g.add(jar("PickleJar2", 0.032, 0.075, F.redGlass, F.goldLid, "lbl_pickle", -0.35, jarY + 0.004, -0.04));
  g.add(jar("SambarPowder", 0.03, 0.07, F.amber, F.lidBlue, null, -0.43, jarY + 0.004, -0.04));
  g.add(bottle("Water1", 0.0345, 0.265, F.waterBottle, F.waterCap, -0.1, botY + 0.004, -0.045));
  g.add(bottle("Water2", 0.0345, 0.265, F.waterBottle, F.waterCap, -0.172, botY + 0.004, -0.045));
  g.add(bottle("Water3", 0.0345, 0.265, F.waterBottle, F.waterCap, -0.1, botY + 0.004, -0.0125));
  { const c2 = bottle("Cola2L", 0.046, 0.33, F.cola, F.colaCap, -0.255, botY + 0.004, -0.05); c2.add(band("ColaPrint", 0.046, 0.11, Math.PI * 2, lbl("bottle_coke"), 0, 0.125, 0)); g.add(c2); }
  { const f2 = bottle("Fanta2L", 0.046, 0.33, F.fanta, F.fantaCap, -0.425, botY + 0.004, -0.05); f2.add(band("FantaPrint", 0.046, 0.11, Math.PI * 2, lbl("bottle_fanta"), 0, 0.125, 0)); g.add(f2); }
  { const cf = group("CoffeeBottle", -0.335, botY + 0.004, -0.045); cf.add(cyl("CoffeeGlass", 0.032, 0.032, 0.17, F.brownGlass, 0, 0.085, 0, 14)); cf.add(cyl("CoffeeNeck", 0.016, 0.032, 0.03, F.brownGlass, 0, 0.185, 0, 14)); cf.add(cyl("CoffeeCap", 0.018, 0.018, 0.014, F.goldLid, 0, 0.207, 0, 12)); cf.add(plane("CoffeeLabel", 0.05, 0.075, lbl("lbl_coffee"), 0, 0.09, 0.0325)); g.add(cf); }
  g.add(bottle("Water4", 0.0345, 0.265, F.waterBottle, F.waterCap, -0.172, botY + 0.004, -0.0125));
  // cans in the lower basket
  // Coke, Fanta, Thums Up and Sprite cans, each wrapped with its own print
  const cans = [[F.canRed, "can_coke"], [F.canOrange, "can_fanta"], [F.canBlack, "can_thumsup"], [F.canRed, "can_coke"], [F.canOrange, "can_fanta"], [F.canGreen, "can_sprite"]];
  cans.forEach(([m, tex], i) => { const c = can("Can", m, -0.075 - i * 0.075, canY + 0.004, -0.04); c.add(band("CanPrint", 0.0333, 0.1, Math.PI * 2, lbl(tex), 0, 0.061, 0)); g.add(c); });
  void sachet;
});
root.add(freezerDoor, fridgeDoor);

const parts = productParts(PRODUCTS, ID);
const clips = stateClips(root, parts);
saveZones(PRODUCTS, ID, root, parts);
const textures = {
  DoorFreezer: `${T}/door_freezer.jpg`, DoorFridge: `${T}/door_fridge.jpg`, SideSteel: `${T}/side.jpg`, SideSteelL: `${T}/side_l.jpg`, RearPlate: `${T}/rear.jpg`,
  LabelBEE: `${T}/label.png`, LgMark: `${T}/lgmark.png`, PlateConvertible: `${T}/plate_convertible.jpg`, PlateControl: `${T}/plate_control.jpg`,
  print_fresh0: `${T}/print_fresh0.png`, print_pullout: `${T}/print_pullout.png`, print_freshzone: `${T}/print_freshzone.png`,
};
for (const n of Object.keys(labelMats)) textures[n] = `${T}/${n}.jpg`;
await exportGLB(root, clips, OUT, textures);
