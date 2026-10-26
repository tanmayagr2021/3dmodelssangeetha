// LG GLT4626TMPZ.DPZZEBN, 466 L double-door refrigerator, Shiny Steel (spreadsheet says 462 L; LG and Sangeetha say 466 L).
// Built to LG's published size, 700 W x 1845 H x 725 D mm (LG's page and the Sangeetha listing), from LG's gallery photos of this
// model (front, 3/4, open, stocked, rear): freezer on top (103 L) with an LED display on its door, a brushed-steel Convertible plate,
// one glass shelf and a manual ice maker (lever and two trays); fridge below (363 L) with a pull-out Fresh 0 Zone tray, a
// Hygiene Fresh plate, three tempered-glass shelves and a Fresh Zone drawer; 2 baskets in the freezer door and 4 in the fridge
// door; both doors hinged on the right; a horizontal pocket grip (black band) across the top of the fridge door.
// Stocked for a south Indian kitchen. usage: node make_lg_glt4626.mjs <entry json> <tex dir> <out.glb>
import fs from "node:fs";
import { THREE, mat, mesh, box, faced, group, flipV, stateClips, exportGLB, productParts, saveZones } from "./lib.mjs";
import { LGStock } from "./stock_lg.mjs";

const [PRODUCTS, TEX, OUT] = process.argv.slice(2);
const ID = "lg-glt4626tmpz";
const T = `${TEX}/lg_glt4626`, T3 = `${TEX}/lg_glt3426`;   // T3: food labels, cans, LG mark and prints shared with the 343 L

// ── size (metres) ──
const W = 0.700, H = 1.845, D = 0.725;
const doorT = 0.045, Dc = D - doorT;
const zBack = -D / 2, zFront = zBack + Dc;
const wall = 0.036, feet = 0.022;
const inW = W - 2 * wall, zIn1 = zBack + 0.06, inD = zFront - zIn1;
// vertical layout (measured on LG's photos, see NOTES): freezer cavity, mullion with the grip, fridge cavity
const fy0 = 1.362, fy1 = H - 0.045;         // freezer cavity floor and ceiling
const gy0 = 0.075, gy1 = 1.281;               // fridge cavity floor and ceiling
const fzBot = 1.320;                         // freezer door bottom edge
const frTop = 1.312, frLow = 0.045;          // fridge door top (with its upper lip) and bottom
const bandTop = 1.302, bandBot = 1.270, lipLow = 1.257;   // the black pocket grip, and the lower lip under it

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
const plateHyg = mat("PlateHygiene", 0xffffff, { metal: 0.5, rough: 0.4 });
const displayM = mat("Display", 0xffffff, { rough: 0.25, opacity: 0.999 });
const printF0 = mat("print_fresh0", 0xffffff, { rough: 0.6, opacity: 0.999 });
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
const stock = LGStock({ T3: `${TEX}/lg_glt3426`, TF: `${TEX}/food` });

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

const root = group("LGGLT4626");
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
  const pts = [[-0.255, 0.44], [-0.272, 0.35], [-0.265, 0.24], [-0.21, 0.17], [-0.13, 0.12], [-0.04, 0.105]].map(([x, y]) => new THREE.Vector3(x, y, zBack - 0.006));
  cab.add(mesh("PowerCord", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), 90, 0.004, 6, false), cordM));
  const sh = new THREE.Shape(), w = 0.045, h = 0.042, r = 0.012;
  sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2);
  sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const plug = mesh("Plug", new THREE.ExtrudeGeometry(sh, { depth: 0.016, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2, curveSegments: 8 }), plugM, -0.04, 0.105, zBack - 0.006);
  plug.rotation.y = Math.PI;
  cab.add(plug);
  for (const [dx, dy] of [[0, 0.0105], [-0.0095, -0.0065], [0.0095, -0.0065]]) {
    const pin = cyl("PlugPin", 0.0026, 0.0026, 0.016, pinM, -0.04 + dx, 0.105 + dy, zBack - 0.006 - 0.016 - 0.008, 10);
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
cab.add(plane("PlateConvertible", 0.161, 0.074, plateConv, 0.015, 1.608, zIn1 + 0.0125));
// the cold-air grille across the top of the back wall (white slotted panel in LG's photos)
cab.add(box("FreezerGrille", 0.23, 0.026, 0.01, white, 0.0, fy1 - 0.05, zIn1 + 0.011));
for (let i = 0; i < 6; i++) cab.add(box("FreezerGrilleSlot", 0.19, 0.0025, 0.002, plinth, 0, fy1 - 0.04 - i * 0.0042, zIn1 + 0.0165));
// freezer glass shelf across the cavity, with a metal front rail
{
  const y = 1.536, g = group("FreezerShelf", 0, y, 0), bd = inD - 0.06;
  g.add(box("FzShelfGlass", inW - 0.012, 0.005, bd, glass, 0, 0, zIn1 + bd / 2 + 0.02));
  g.add(box("FzShelfRimF", inW - 0.008, 0.012, 0.01, glassRim, 0, 0.004, zFront - 0.04));
  g.add(box("FzShelfRimB", inW - 0.008, 0.01, 0.008, glassRim, 0, 0.003, zIn1 + 0.03));
  g.add(box("FzShelfRailL", 0.008, 0.012, bd, glassRim, xL + 0.01, 0.003, zIn1 + bd / 2 + 0.02));
  g.add(box("FzShelfRailR", 0.008, 0.012, bd, glassRim, xR - 0.01, 0.003, zIn1 + bd / 2 + 0.02));
  cab.add(g);
}
// the ice maker's housing: a white frame the tray and bucket slide in and out of
const icX = -0.104, icW = 0.18, icZ = zFront - 0.04, icDY = 0.213;
cab.add(box("IceHousingTop", icW + 0.01, 0.006, 0.2, white, icX, 1.317 + icDY, icZ - 0.1));
cab.add(box("IceHousingSideL", 0.005, 0.14, 0.2, white, icX - icW / 2 - 0.0025, 1.247 + icDY, icZ - 0.1));
cab.add(box("IceHousingSideR", 0.005, 0.14, 0.2, white, icX + icW / 2 + 0.0025, 1.247 + icDY, icZ - 0.1));

// ── fridge inside ──
cab.add(box("FridgeLed", 0.2, 0.006, 0.016, lightM, 0, gy1 - 0.006, zFront - 0.15));
// Fresh 0 Zone: a pull-out tray at the top, a clear box on side rails with LG's printed words on its lip
{
  const g = group("Fresh0Zone", 0, 1.095, 0), bw = inW - 0.012, bd = 0.40, bh = 0.14, zc = zIn1 + bd / 2 + 0.012;
  g.add(box("F0Floor", bw, 0.004, bd, clear, 0, 0, zc));
  g.add(box("F0Back", bw, bh, 0.004, clearLight, 0, bh / 2, zIn1 + 0.014));
  g.add(box("F0SideL", 0.004, bh, bd, clear, -bw / 2, bh / 2, zc));
  g.add(box("F0SideR", 0.004, bh, bd, clear, bw / 2, bh / 2, zc));
  g.add(box("F0FrontLow", bw, 0.05, 0.004, clearLight, 0, 0.025, zc + bd / 2));
  g.add(box("F0FrontHigh", bw - 0.02, 0.07, 0.004, clearLight, 0, 0.09, zc + bd / 2 - 0.004));
  g.add(box("F0Rim", bw, 0.008, 0.01, clearRib, 0, bh - 0.003, zc + bd / 2 - 0.004));
  g.add(box("F0Handle", 0.18, 0.012, 0.014, clearRib, 0, 0.05, zc + bd / 2 + 0.006));
  g.add(plane("PrintFresh0", 0.17, 0.0378, printF0, 0, 0.1, zc + bd / 2 - 0.0015));
  cab.add(g);
  // butter, paneer, curd cups and a cheese block on its floor
  stock.fresh0(cab, { y: 1.099, z: zc + 0.03 });
}
// the round temperature plate on the back wall
cab.add(plane("PlateHygiene", 0.161, 0.075, plateHyg, 0.015, 0.98, zIn1 + 0.0125));
// two round sensors on the left wall (LG's open-door photo)
for (const sy of [0.98, 0.86]) cab.add(cyl("WallSensor", 0.012, 0.012, 0.004, white, xL + 0.003, sy, zIn1 + 0.2).rotateZ(Math.PI / 2));
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
shelf("Shelf1", 0.894);
shelf("Shelf2", 0.723);
shelf("Shelf3", 0.501);
{ // Fresh Zone: a glass cover over a big clear drawer with LG's printed words on its front
  const g = group("FreshZone", 0, 0, 0), bd = inD - 0.08, bw = inW - 0.02, zc = zIn1 + bd / 2 + 0.016;
  g.add(box("FzGlassCover", inW - 0.01, 0.006, bd, glass, 0, 0.395, zc));
  g.add(box("FzCoverRim", inW - 0.01, 0.012, 0.012, glassRim, 0, 0.398, zFront - 0.05));
  g.add(box("FzBoxFloor", bw, 0.004, bd, clear, 0, 0.105, zc));
  g.add(box("FzBoxBack", bw, 0.25, 0.004, clear, 0, 0.23, zIn1 + 0.018));
  g.add(box("FzBoxL", 0.004, 0.25, bd, clear, -bw / 2, 0.23, zc));
  g.add(box("FzBoxR", 0.004, 0.25, bd, clear, bw / 2, 0.23, zc));
  g.add(box("FzBoxFront", bw, 0.25, 0.004, clearLight, 0, 0.23, zc + bd / 2));
  g.add(box("FzBoxRim", bw, 0.008, 0.008, clearRib, 0, 0.355, zc + bd / 2));
  g.add(box("FzBoxFootRim", bw, 0.008, 0.008, clearRib, 0, 0.108, zc + bd / 2));
  g.add(plane("PrintFreshZone", 0.17, 0.0442, printFz, 0, 0.215, zc + bd / 2 + 0.0023));
  cab.add(g);
}

// ── stock: vegetarian South Indian food, eggs, juices, water and soft drinks (stock_lg.mjs, food.mjs) ──
stock.shelves(cab, { zIn1, s1: 0.894, s2: 0.723, s3: 0.501, fz: 0.109 });
stock.freezer(cab, { zIn1, floor: fy0 + 0.002, top: 1.541 });

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
  g.add(plane("LgMarkDecal", 0.054, 0.0248, logoM, -pw + 0.060, h - 0.045, doorT + 0.0006));
  g.add(plane("BeeLabelDecal", 0.0925, 0.176, labelM, -0.069, h - 0.033 - 0.088, doorT + 0.0006));
  g.add(plane("DisplayDecal", 0.058, 0.166, displayM, -pw / 2, 1.581 - fzBot, doorT + 0.0006));
  // inside: gasket frame, liner, two baskets
  g.add(box("FzGasketT", pw - 0.02, 0.014, 0.014, gasket, -pw / 2, h - 0.012, -0.007));
  g.add(box("FzGasketB", pw - 0.02, 0.014, 0.014, gasket, -pw / 2, 0.012, -0.007));
  g.add(box("FzGasketL", 0.014, h - 0.02, 0.014, gasket, -pw + 0.012, h / 2, -0.007));
  g.add(box("FzGasketR", 0.014, h - 0.02, 0.014, gasket, -0.012, h / 2, -0.007));
  g.add(box("FzLiner", pw - 0.05, h - 0.05, 0.012, liner, -pw / 2, h / 2, -0.004));
  const b1 = basket("FzBasket1", pw - 0.1, 0.07, 0.065, 0.33, true); b1.position.x = -pw / 2; g.add(b1);
  const b2 = basket("FzBasket2", pw - 0.1, 0.07, 0.065, 0.10, true); b2.position.x = -pw / 2; g.add(b2);
  // frozen grated coconut and parotta in the baskets (small packs)
  stock.doorFreezer(g, { n: 4, gap: 0.15, b1: 0.33, b2: 0.10 });
});
const fridgeDoor = doorShell("FridgeDoor", frLow, frTop - frLow, (g) => {
  const h = frTop - frLow, lowH = lipLow - frLow, lipLowH = bandBot - lipLow, bandH = bandTop - bandBot, lipH = frTop - bandTop;
  g.add(mesh("FrPanelLow", flipV(new THREE.BoxGeometry(pw, lowH, doorT)), [steelEdge, steelEdge, steelEdge, steelEdge, steelDoorR, liner], -pw / 2, lowH / 2, doorT / 2));
  g.add(mesh("FrLip", new THREE.BoxGeometry(pw, lipH, doorT), [steelEdge, steelEdge, topSteel, steelEdge, silverLip, liner], -pw / 2, lowH + lipLowH + bandH + lipH / 2, doorT / 2));
  g.add(mesh("FrLipLow", new THREE.BoxGeometry(pw, lipLowH, doorT), [steelEdge, steelEdge, steelEdge, steelEdge, silverLip, liner], -pw / 2, lowH + lipLowH / 2, doorT / 2));
  g.add(box("GripBand", pw - 0.02, bandH, doorT - 0.016, black, -pw / 2, lowH + lipLowH + bandH / 2, (doorT - 0.016) / 2));
  for (const sx of [-1, 1]) g.add(box("GripEnd", 0.012, bandH, doorT, black, -pw / 2 + sx * (pw / 2 - 0.006), lowH + lipLowH + bandH / 2, doorT / 2));
  // inside: gasket, liner, three baskets
  g.add(box("FrGasketT", pw - 0.02, 0.014, 0.014, gasket, -pw / 2, h - 0.012, -0.007));
  g.add(box("FrGasketB", pw - 0.02, 0.014, 0.014, gasket, -pw / 2, 0.012, -0.007));
  g.add(box("FrGasketL", 0.014, h - 0.02, 0.014, gasket, -pw + 0.012, h / 2, -0.007));
  g.add(box("FrGasketR", 0.014, h - 0.02, 0.014, gasket, -0.012, h / 2, -0.007));
  g.add(box("FrLiner", pw - 0.05, h - 0.05, 0.012, liner, -pw / 2, h / 2, -0.004));
  const eggY = 1.085 - frLow, jarY = 0.865 - frLow, botY = 0.385 - frLow, canY = 0.085 - frLow;
  const bE = basket("EggBasket", pw - 0.12, 0.075, 0.062, eggY, true); bE.position.x = -pw / 2; g.add(bE);
  const bJ = basket("JarBasket", pw - 0.12, 0.085, 0.085, jarY, true); bJ.position.x = -pw / 2; g.add(bJ);
  const bB = basket("BottleBasket", pw - 0.12, 0.095, 0.17, botY, true); bB.position.x = -pw / 2; g.add(bB);
  const bC = basket("CanBasket", pw - 0.12, 0.075, 0.115, canY, true); bC.position.x = -pw / 2; g.add(bC);
  // eggs in the egg basket's cups, then jars, bottles and cans (stock_lg.mjs)
  g.add(box("EggCupsRib", pw - 0.14, 0.006, 0.05, clearRib, -pw / 2, eggY + 0.006, -0.037));
  stock.doorFridge(g, { eggY, jarY, botY, canY });
});
root.add(freezerDoor, fridgeDoor);

const parts = productParts(PRODUCTS, ID);
const clips = stateClips(root, parts);
saveZones(PRODUCTS, ID, root, parts);
const textures = {
  DoorFreezer: `${T}/door_freezer.jpg`, DoorFridge: `${T}/door_fridge.jpg`, SideSteel: `${T}/side.jpg`, SideSteelL: `${T}/side_l.jpg`, RearPlate: `${T}/rear.jpg`,
  LabelBEE: `${T}/label.png`, LgMark: `${T3}/lgmark.png`, PlateConvertible: `${T3}/plate_convertible.jpg`, PlateHygiene: `${T}/plate_hygiene.jpg`, Display: `${T}/display.png`,
  print_fresh0: `${T}/print_fresh0.png`, print_freshzone: `${T3}/print_freshzone.png`,
};
Object.assign(textures, stock.textures());
await exportGLB(root, clips, OUT, textures);
