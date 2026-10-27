// LG GLT2526XWPZ.DPZZEBN, 251 L double-door refrigerator, Shiny Steel.
// Built to LG's published size, 555 W x 1573 H x 637 D mm (manual table, GLT25**), from LG's gallery photos (front, side,
// open, stocked, rear) and its owner's manual: freezer on top (59 L) with a Convertible knob, a wire shelf and a manual
// ice maker (lever and two trays); fridge below (192 L) with a Turbo Fresh Zone box, two tempered-glass shelves and a
// Fresh Zone vegetable drawer; 2 baskets in the freezer door and 3 in the fridge door; both doors hinged on the right;
// no handles, a black pocket grip across the top of the fridge door.
// The shelves are stocked for a south Indian kitchen (eggs, curd, idli batter, filter coffee, ghee, coconut, curry leaves...).
// usage: node make_lg_glt2526.mjs <products.json> <tex dir> <out.glb>
import fs from "node:fs";
import { THREE, mat, mesh, box, faced, group, flipV, stateClips, exportGLB, productParts, saveZones } from "./lib.mjs";
import { LGStock } from "./stock_lg.mjs";

const [PRODUCTS, TEX, OUT] = process.argv.slice(2);
const ID = "lg-glt2526xwpz";
const T = `${TEX}/lg_glt2526`;

// ── size (metres) ──
const W = 0.555, H = 1.573, D = 0.637;
const doorT = 0.045, Dc = D - doorT;
const zBack = -D / 2, zFront = zBack + Dc;
const wall = 0.034, feet = 0.022;
const inW = W - 2 * wall, zIn1 = zBack + 0.06, inD = zFront - zIn1;
// vertical layout (measured on LG's photos, see NOTES): freezer cavity, mullion with the grip, fridge cavity
const fy0 = 1.119, fy1 = H - 0.045;          // freezer cavity floor and ceiling
const gy0 = 0.045, gy1 = 1.043;               // fridge cavity floor and ceiling
const fzBot = 1.092;                         // freezer door bottom edge
const frTop = 1.085, frLow = 0.028;          // fridge door top (with its lip) and bottom
const bandTop = 1.076, bandBot = 1.047;      // the black pocket grip

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
const printConv = mat("PrintConvertible", 0xffffff, { rough: 0.7, opacity: 0.999 });
const freshZoneM = mat("FreshZoneFront", 0xffffff, { rough: 0.5 });
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
const stock = LGStock({ T3: `${TEX}/lg_glt3426`, TF: `${TEX}/food`, BR: `${TEX}/brands`, BRT: `${TEX}/brands/small` });

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

const root = group("LGGLT2526");
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
// temperature knob (Min - Max) and the word Convertible, printed on the back wall
{
  cab.add(plane("PrintConvertible", 0.17, 0.062, printConv, -0.075, 1.378, zIn1 + 0.0125));
  const k = group("FreezerKnob", -0.12, 1.355, zIn1 + 0.012);
  k.add(mesh("KnobBody", new THREE.CylinderGeometry(0.0165, 0.0165, 0.012, 24), knobSide).rotateX(Math.PI / 2).translateY(0.0));
  const kf = mesh("KnobTopFace", new THREE.CircleGeometry(0.0155, 24), knobM, 0, 0, 0.0062); kf.geometry = flipV(kf.geometry); k.add(kf);
  cab.add(k);
}
// freezer shelf (a wire-edged tray) across the cavity
{
  const y = 1.322, g = group("FreezerShelf", 0, y, 0);
  g.add(box("TrayPlate", inW - 0.012, 0.004, inD - 0.06, glass, 0, 0, zIn1 + (inD - 0.06) / 2 + 0.02));
  g.add(box("TrayFrame", inW - 0.008, 0.01, 0.008, wire, 0, 0.004, zFront - 0.04));
  g.add(box("TrayBack", inW - 0.008, 0.01, 0.008, wire, 0, 0.004, zIn1 + 0.03));
  g.add(box("TrayRailL", 0.008, 0.01, inD - 0.07, wire, xL + 0.01, 0.004, zIn1 + (inD - 0.06) / 2 + 0.02));
  g.add(box("TrayRailR", 0.008, 0.01, inD - 0.07, wire, xR - 0.01, 0.004, zIn1 + (inD - 0.06) / 2 + 0.02));
  for (let i = 0; i < 9; i++) g.add(box("TrayBar", 0.003, 0.003, inD - 0.07, wire, xL + 0.04 + i * 0.05, 0.003, zIn1 + (inD - 0.06) / 2 + 0.02));
  cab.add(g);
}
// the ice maker's housing: a white frame the tray and bucket slide in and out of
const icX = 0.085, icW = 0.17, icZ = zFront - 0.04;
cab.add(box("IceHousingTop", icW + 0.01, 0.006, 0.2, white, icX, 1.317, icZ - 0.1));
cab.add(box("IceHousingSideL", 0.005, 0.14, 0.2, white, icX - icW / 2 - 0.0025, 1.247, icZ - 0.1));
cab.add(box("IceHousingSideR", 0.005, 0.14, 0.2, white, icX + icW / 2 + 0.0025, 1.247, icZ - 0.1));

// ── fridge inside ──
cab.add(box("FridgeLed", 0.2, 0.006, 0.016, lightM, 0, gy1 - 0.006, zFront - 0.15));
// Turbo Fresh Zone: a three-section box at the top
{
  const g = group("TurboFreshZone", 0, 0.867, 0), bw = inW - 0.01, bd = 0.34, bh = 0.138, zc = zIn1 + bd / 2 + 0.012;
  g.add(box("TfzFloor", bw, 0.004, bd, clear, 0, 0, zc));
  g.add(box("TfzBack", bw, bh, 0.004, white, 0, bh / 2, zIn1 + 0.014));
  g.add(box("TfzSideL", 0.004, bh, bd, clear, -bw / 2, bh / 2, zc));
  g.add(box("TfzSideR", 0.004, bh, bd, clear, bw / 2, bh / 2, zc));
  for (const dx of [-0.08, 0.08]) g.add(box("TfzDivider", 0.004, bh, bd, clear, dx, bh / 2, zc));
  g.add(box("TfzLid", bw, 0.004, bd, glass, 0, bh, zc));
  g.add(box("TfzFrontRail", bw, 0.01, 0.008, glassRim, 0, 0.006, zc + bd / 2));
  cab.add(g);
  // butter, paneer and curd cups in its sections
  stock.fresh0(cab, { y: 0.871, z: zc + 0.04, bx: -0.165, px: 0, cx: 0.145, ex: 0.16, ez: 0.1 });
}
// two tempered-glass shelves with white rims, and the Fresh Zone drawer
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
shelf("Shelf1", 0.744);
shelf("Shelf2", 0.545);
{ // Fresh Zone: the "bottom shelf" glass cover, a clear box, and a white front panel
  const g = group("FreshZone", 0, 0, 0), bd = inD - 0.08, bw = inW - 0.02, zc = zIn1 + bd / 2 + 0.016;
  g.add(box("FzGlassCover", inW - 0.01, 0.006, bd, glass, 0, 0.406, zc));
  g.add(box("FzCoverRim", inW - 0.01, 0.012, 0.012, glassRim, 0, 0.409, zFront - 0.05));
  g.add(box("FzBoxFloor", bw, 0.004, bd, clear, 0, 0.215, zc));
  g.add(box("FzBoxBack", bw, 0.16, 0.004, clear, 0, 0.295, zIn1 + 0.018));
  g.add(box("FzBoxL", 0.004, 0.16, bd, clear, -bw / 2, 0.295, zc));
  g.add(box("FzBoxR", 0.004, 0.16, bd, clear, bw / 2, 0.295, zc));
  g.add(box("FzBoxRim", bw, 0.008, 0.008, clearRib, 0, 0.375, zc + bd / 2));
  g.add(box("FzBoxFootRim", bw, 0.008, 0.008, clearRib, 0, 0.219, zc + bd / 2));
  g.add(mesh("FzFrontPanel", flipV(new THREE.BoxGeometry(inW - 0.01, 0.14, 0.02)), [white, white, white, white, freshZoneM, white], 0, 0.14, zFront - 0.05));
  cab.add(g);
}

// ── stock: vegetarian South Indian food, eggs, juices, water and soft drinks (stock_lg.mjs, food.mjs) ──
stock.shelves(cab, { zIn1, inW, inD, s1: 0.744, s2: 0.545, s3: null, fz: 0.219, z0: zIn1 + 0.17 });
stock.freezer(cab, { zIn1, floor: fy0 + 0.002, top: 1.327 });

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
ic.position.y = 0;     // the geometry above carries its own heights; the node only slides along z

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
  const b1 = basket("FzBasket1", pw - 0.1, 0.07, 0.065, 0.234, true); b1.position.x = -pw / 2; g.add(b1);
  const b2 = basket("FzBasket2", pw - 0.1, 0.07, 0.065, 0.053, true); b2.position.x = -pw / 2; g.add(b2);
  // frozen grated coconut and parotta in the baskets (small packs)
  stock.doorFreezer(g, { n: 3, gap: 0.12, b1: 0.234, b2: 0.053 });
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
  const eggY = 0.882 - frLow, botY = 0.387 - frLow, canY = 0.14 - frLow;
  const bE = basket("EggBasket", pw - 0.1, 0.075, 0.062, eggY, true); bE.position.x = -pw / 2; g.add(bE);
  const bB = basket("BottleBasket", pw - 0.1, 0.095, 0.145, botY, true); bB.position.x = -pw / 2; g.add(bB);
  const bC = basket("CanBasket", pw - 0.1, 0.075, 0.115, canY, true); bC.position.x = -pw / 2; g.add(bC);
  // eggs in the egg basket's cups, then jars, bottles and cans (stock_lg.mjs)
  g.add(box("EggCupsRib", pw - 0.14, 0.006, 0.05, clearRib, -pw / 2, eggY + 0.006, -0.037));
  stock.doorFridge(g, { eggY, jarY: null, botY, canY });
});
root.add(freezerDoor, fridgeDoor);

const parts = productParts(PRODUCTS, ID);
const clips = stateClips(root, parts);
saveZones(PRODUCTS, ID, root, parts);
const textures = {
  DoorFreezer: `${T}/door_freezer.jpg`, DoorFridge: `${T}/door_fridge.jpg`, SideSteel: `${T}/side.jpg`, SideSteelL: `${T}/side_l.jpg`, RearPlate: `${T}/rear.jpg`,
  LabelBEE: `${T}/label.png`, LgMark: `${T}/lgmark.png`, PrintConvertible: `${T}/print_convertible.png`, KnobFace: `${T}/knob.jpg`, FreshZoneFront: `${T}/fresh_zone.jpg`,
};
Object.assign(textures, stock.textures());
await exportGLB(root, clips, OUT, textures);
