// Samsung RT34HG5A42BXHL, 330 L double door, Luxe Black.
// Built to Samsung's published size, 630 W x 1710 H x 740 D mm, and the official photos:
// freezer on top (75 L), fridge below (255 L), both doors hinged on the right with
// recessed handles on the left edge, the BEE label on the freezer door.
// usage: node make_samsung_rt34.mjs <products.json> <tex dir> <out.glb>
import fs from "node:fs";
import { LGStock } from "./stock_lg.mjs";
import { THREE, mat, mesh, box, faced, group, stateClips, exportGLB, productParts, saveZones } from "./lib.mjs";

const [PRODUCTS, TEX, OUT] = process.argv.slice(2);
const ID = "samsung-rt34hg5a42bxhl";

// ── size (metres) ──
const W = 0.63, H = 1.71, D = 0.74;
const doorT = 0.05, Dc = D - doorT;
const zBack = -D / 2, zFront = zBack + Dc;
const wall = 0.03, feet = 0.018, floorTop = 0.07;
const doorBottom = 0.04, gap = 0.006;
const yFreezer = 1.148, freezerH = H - yFreezer, fridgeH = yFreezer - gap - doorBottom;
const yDiv = yFreezer - gap / 2;

// ── materials ──
const flipV = (geo) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); return geo; };
const body = mat("Body", 0x3d3e43, { metal: 0.22, rough: 0.5 });
const topSkin = mat("TopSkin", 0x1e1f23, { metal: 0.1, rough: 0.8 });
const freezerFront = mat("FreezerFront", 0xffffff, { metal: 0.5, rough: 0.3 });
const fridgeFront = mat("FridgeFront", 0xffffff, { metal: 0.5, rough: 0.3 });
const doorEdge = mat("DoorEdge", 0x27282c, { metal: 0.5, rough: 0.35 });
const recess = mat("Recess", 0x0c0d0f, { rough: 0.6 });
const liner = mat("Liner", 0xdfe2e5, { rough: 0.72, emissive: 0x7d8186, emissiveIntensity: 0.55 });
const trim = mat("Trim", 0xb9bec4, { rough: 0.4 });
const glass = mat("Glass", 0xcfe3ea, { rough: 0.05, opacity: 0.45 });
const binMat = mat("Bin", 0xcfe0ea, { rough: 0.15, opacity: 0.62 });
const frosted = mat("Frosted", 0xe6edf1, { rough: 0.45, opacity: 0.78 });
const gasket = mat("Gasket", 0xb8bcc0, { rough: 0.85 });
const light = mat("Light", 0xffffff, { emissive: 0xf4f8ff, emissiveIntensity: 1.4 });
const panelMat = mat("InnerPanel", 0xffffff, { rough: 0.45, opacity: 0.999 });
const backFz = mat("BackFreezer", 0xffffff, { rough: 0.7 }), backFr = mat("BackFridge", 0xffffff, { rough: 0.7 });
const bigBoxPrint = mat("BigBoxPrint", 0xffffff, { rough: 0.5, opacity: 0.999 }), iceMakerPrint = mat("IceMakerPrint", 0xffffff, { rough: 0.5, opacity: 0.999 });
const railGrey = mat("Rail", 0xdfe2e6, { rough: 0.5 });
const clearLite = mat("ClearLight", 0xdfe7ee, { rough: 0.12, opacity: 0.3, side: THREE.DoubleSide });
const iceWhite = mat("IceMakerWhite", 0xf1f3f5, { rough: 0.45 });
const iceSlot = mat("IceSlot", 0xa9adb3, { rough: 0.6 }), grille = mat("Grille", 0xbfc3c8, { rough: 0.6 });
const back = mat("Back", 0x96999d, { metal: 0.3, rough: 0.7 });
const foot = mat("Foot", 0x141518, { rough: 0.7 });
const sideBrushed = mat("SideBrushed", 0xffffff, { metal: 0.3, rough: 0.5 });
const rearMat = mat("Rear", 0xffffff, { metal: 0.35, rough: 0.55 });
const bayMat = mat("Bay", 0xffffff, { rough: 0.7 });
const bayDark = mat("BayDark", 0x0f1012, { rough: 0.85 });
const cordMat = mat("Cord", 0x5d6064, { rough: 0.6 });
const plugMat = mat("Plug", 0x45474b, { rough: 0.5 });
const pinMat = mat("Pin", 0xb7bbc0, { metal: 0.9, rough: 0.3 });
const silver = mat("Silver", 0xc9ccd0, { metal: 0.9, rough: 0.25 });

// rear: the cord path and bay position are read off Samsung's rear photo by tex_samsung_extra.py
const rp = JSON.parse(fs.readFileSync(`${TEX}/samsung/cord_path.json`, "utf8"));
const bayTop = rp.bay_top, bayD = 0.17;       // the compressor bay opens at the rear, up to 284 mm; its depth is an estimate

const root = group("SamsungRT34");
const cab = group("Cabinet");
root.add(cab);

// ── cabinet: dark metal outside, white inside ──
const shellH = H - feet, shellMid = feet + shellH / 2, zMid = zBack + Dc / 2;
cab.add(faced("SideLeft", wall, shellH, Dc, [liner, sideBrushed, topSkin, body, body, body], -W / 2 + wall / 2, shellMid, zMid));
cab.add(faced("SideRight", wall, shellH, Dc, [sideBrushed, liner, topSkin, body, body, body], W / 2 - wall / 2, shellMid, zMid));
cab.add(faced("Top", W - 2 * wall, wall, Dc, [body, body, topSkin, liner, body, body], 0, H - wall / 2, zMid));
cab.add(faced("Floor", W - 2 * wall, floorTop - feet, Dc, [body, body, liner, body, body, body], 0, feet + (floorTop - feet) / 2, zMid));
const wallH = H - wall - bayTop;
cab.add(faced("BackWall", W - 2 * wall, wallH, wall, [liner, liner, liner, liner, liner, back], 0, bayTop + wallH / 2, zBack + 0.004 + wall / 2));
// outer back: Samsung's silver dimpled panel above the compressor bay (flush with the 740 mm depth)
const rearH = H - bayTop;
// 3.2 mm narrower and 1.6 mm shorter: the exporter moves overlapping surfaces 0.8 mm apart, and this keeps the model at the published 630 x 1710 mm
cab.add(mesh("RearPanel", flipV(new THREE.BoxGeometry(W - 0.0032, rearH - 0.0032, 0.004)), [back, back, back, back, back, rearMat], 0, bayTop + rearH / 2, zBack + 0.002));
// the open compressor bay below it: dark walls, ceiling and floor, and the photographed machinery on its back wall
const bayH = bayTop - floorTop, bayW = W - 2 * wall;
cab.add(box("BayCeiling", bayW, 0.01, bayD, bayDark, 0, bayTop + 0.005, zBack + bayD / 2));
cab.add(box("BayFloor", bayW, 0.004, bayD, bayDark, 0, floorTop + 0.002, zBack + bayD / 2));
cab.add(box("BaySideL", 0.004, bayH - 0.0012, bayD, bayDark, -bayW / 2 + 0.002, floorTop + (bayH - 0.0012) / 2, zBack + bayD / 2));
cab.add(box("BaySideR", 0.004, bayH - 0.0012, bayD, bayDark, bayW / 2 - 0.002, floorTop + (bayH - 0.0012) / 2, zBack + bayD / 2));
cab.add(mesh("BayBack", flipV(new THREE.BoxGeometry(bayW, bayH, 0.012)), [liner, liner, liner, liner, liner, bayMat], 0, floorTop + bayH / 2, zBack + bayD + 0.006));
{ // power cord down the back to its three-pin plug (cord 8 mm and plug 45 x 42 x 20 mm, estimated from the photo)
  const pts = rp.cord.map(([x, y]) => new THREE.Vector3(x, y, zBack - 0.004));
  cab.add(mesh("PowerCord", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), 120, rp.cord_d / 2, 6, false), cordMat));
  const [px, py] = rp.plug;
  const sh = new THREE.Shape(), w = 0.045, h = 0.042, r = 0.012;
  sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2);
  sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const plug = mesh("Plug", new THREE.ExtrudeGeometry(sh, { depth: 0.016, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2, curveSegments: 8 }), plugMat, px, py, zBack - 0.004);
  plug.rotation.y = Math.PI;
  cab.add(plug);
  for (const [dx, dy] of [[0, 0.0105], [-0.0095, -0.0065], [0.0095, -0.0065]]) {
    const pin = mesh("PlugPin", new THREE.CylinderGeometry(0.0026, 0.0026, 0.016, 10), pinMat, px + dx, py + dy, zBack - 0.004 - 0.016 - 0.008);
    pin.rotation.x = Math.PI / 2; cab.add(pin);
  }
}
cab.add(box("Divider", W - 2 * wall, 0.08, Dc - wall, liner, 0, 1.158, zMid + wall / 2));   // 80 mm thick: fridge ceiling at 1.118, freezer floor at 1.198 (open-door photo)
cab.add(box("CenterHinge", 0.07, 0.014, 0.034, silver, W / 2 - 0.05, yDiv - 0.004, zFront + 0.004));
cab.add(box("DividerTrim", W - 2 * wall, 0.008, 0.004, silver, 0, yDiv, zFront - 0.001));
cab.add(box("Plinth", W - 0.03, doorBottom - feet - 0.002, 0.012, foot, 0, feet + (doorBottom - feet) / 2, zFront - 0.008));
cab.add(box("PlinthTab", 0.05, feet, 0.03, foot, 0, feet / 2, zFront - 0.02));
for (const [fx, fz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
  cab.add(mesh("Foot", new THREE.CylinderGeometry(0.017, 0.019, feet, 20), foot, fx * (W / 2 - 0.035), feet / 2, zMid + fz * (Dc / 2 - 0.035)));
}

// ── fridge and freezer insides, measured on Samsung's open-door photo (g_550669408.jpg, 0.637 px/mm; heights are metres above the floor) ──
const inW = W - 2 * wall - 0.006, inD = Dc - wall - 0.11, inZ = zBack + wall + inD / 2 + 0.01;
// the big drawer stops short of the compressor bay's step at the rear
const stepIn = bayD + 0.015 - (wall + 0.01), inDc = inD - stepIn, inZc = inZ + stepIn / 2;
const zIn = zBack + 0.004 + wall;                          // the inner face of the back wall
const zShelfF = inZ + inD / 2;                             // front edge of the shelves
function glassShelf(name, y) {                             // a tempered-glass shelf with its white front rim and side rails
  cab.add(box(name, inW - 0.014, 0.006, inD - 0.03, glass, 0, y, inZ - 0.01));
  cab.add(box(name + "Rim", inW - 0.014, 0.016, 0.009, frosted, 0, y + 0.004, zShelfF - 0.03));
  for (const sx of [-1, 1]) cab.add(box(name + "Rail", 0.012, 0.03, inD - 0.1, railGrey, sx * (inW / 2 - 0.004), y - 0.016, inZ - 0.04));
}
glassShelf("Shelf1", 0.819);                               // 819 mm
glassShelf("Shelf2", 0.654);                               // 654 mm
// back-wall air ducts (Twin Cooling Plus): raised 12 mm, with the vents, the badge, the round grommet and the printed icons
cab.add(mesh("FridgeDuct", flipV(new THREE.BoxGeometry(0.300, 0.518, 0.012)), [liner, liner, liner, liner, backFr, liner], 0.008, 0.847, zIn + 0.006));
cab.add(mesh("FreezerDuct", flipV(new THREE.BoxGeometry(0.376, 0.385, 0.012)), [liner, liner, liner, liner, backFz, liner], 0.008, 1.4005, zIn + 0.006));
{ // the top tray of the fridge (a clear chiller drawer, 981 to 1106 mm) with its white front rim
  const tw = 0.486, td = inD - 0.03, tz = inZ - 0.01, y0 = 0.981;
  cab.add(box("TrayFloor", tw, 0.005, td, binMat, 0, y0 + 0.0025, tz));
  for (const sx of [-1, 1]) cab.add(box("TraySide", 0.004, 0.105, td, binMat, sx * (tw / 2 - 0.002), y0 + 0.055, tz));
  cab.add(box("TrayFront", tw, 0.04, 0.004, clearLite, 0, y0 + 0.022, tz + td / 2 - 0.002));
  cab.add(box("TrayRim", tw, 0.012, 0.008, frosted, 0, y0 + 0.045, tz + td / 2 - 0.004));
  cab.add(box("TrayRail", tw + 0.01, 0.01, 0.01, railGrey, 0, y0 + 0.108, tz + td / 2 - 0.02));
}
{ // the Big Box: one wide clear drawer (107 to 373 mm), "Big Box" and three fruit icons printed on its front
  const bw = 0.505, y0 = 0.107, y1 = 0.373, bd = inDc - 0.02, bz = inZc - 0.002;
  cab.add(box("BigBoxFloor", bw, 0.004, bd, binMat, 0, y0 + 0.002, bz));
  cab.add(box("BigBoxBack", bw, y1 - y0, 0.004, binMat, 0, (y0 + y1) / 2, bz - bd / 2 + 0.002));
  for (const sx of [-1, 1]) cab.add(box("BigBoxSide", 0.004, y1 - y0, bd, binMat, sx * (bw / 2 - 0.002), (y0 + y1) / 2, bz));
  cab.add(box("BigBoxFront", bw, y1 - y0 - 0.03, 0.004, clearLite, 0, y0 + (y1 - y0 - 0.03) / 2, bz + bd / 2 - 0.002));
  cab.add(box("BigBoxRim", bw + 0.01, 0.014, 0.012, frosted, 0, y1 - 0.004, bz + bd / 2 - 0.004));
  cab.add(box("BigBoxFootRim", bw, 0.01, 0.01, frosted, 0, y0 + 0.006, bz + bd / 2));
  cab.add(mesh("BigBoxPrint", flipV(new THREE.PlaneGeometry(0.17, 0.10)), bigBoxPrint, 0, 0.208, bz + bd / 2 + 0.0023));
}
cab.add(box("FridgeLight", 0.2, 0.008, 0.05, light, 0, 1.112, zFront - 0.12));
{ // the touch display on the fridge's right wall (68 x 120 mm), 900 to 974 mm up, 140 mm behind the door edge
  const panel = mesh("InnerPanelFace", flipV(new THREE.PlaneGeometry(0.068, 0.12)), panelMat, W / 2 - wall - 0.001, 0.914, zFront - 0.14);
  panel.rotation.y = -Math.PI / 2;
  cab.add(panel);
}

// ── groceries (stock_lg.mjs, food.mjs): vegetarian South Indian food, eggs, juices, water and soft drinks ──
const stock = LGStock({ T3: `${TEX}/lg_glt3426`, TF: `${TEX}/food`, BR: `${TEX}/brands`, BRT: `${TEX}/brands/small` });
const zBackIn = zIn;
if (!process.env.NOSTOCK) {
  const bbD = inDc - 0.02, bbZ = inZc - 0.002;                // the Big Box (drawer) bounds the vegetables must stay inside
  stock.shelves(cab, {
    zIn1: zBackIn, s1: 0.819, s2: 0.654, s3: null, fz: 0.111, inW, inD,
    vz0: inZc - inDc / 2 + 0.05, vk: (inDc - 0.08) / 0.56,
    drawerB: { hw: 0.505 / 2 - 0.014, z0: bbZ - bbD / 2 + 0.02, z1: bbZ + bbD / 2 - 0.02, y0: 0.111 },
  });
  // the top tray (981 mm) is only 160 mm above the top shelf: scale any taller pack down so it stands clear of the tray
  cab.updateMatrixWorld(true);
  const bb = new THREE.Box3();
  for (const c of cab.getObjectByName("Shelf1Stock").children) {
    bb.setFromObject(c);
    if (bb.max.y > 0.972) c.scale.multiplyScalar((0.972 - bb.min.y) / (bb.max.y - bb.min.y));
  }
}

// ── freezer inside: floor at 1198 mm, a clear shelf at 1451 mm, the Movable Ice Maker at the front left ──
cab.add(box("FreezerShelf", inW - 0.014, 0.006, inD - 0.03, clearLite, 0, 1.451, inZ - 0.01));
cab.add(box("FreezerShelfRim", inW - 0.014, 0.022, 0.009, frosted, 0, 1.46, zShelfF - 0.03));
for (const sx of [-1, 1]) cab.add(box("FreezerShelfRail", 0.012, 0.03, inD - 0.1, railGrey, sx * (inW / 2 - 0.004), 1.435, inZ - 0.04));
{
  const ic = group("IceMakerUnit", -0.1275, 1.208, 0.04);      // 181 mm wide, 1208 to 1380 mm, set at the front
  ic.add(box("IceHousing", 0.181, 0.172, 0.22, iceWhite, 0, 0.086, 0));
  ic.add(box("IceHousingTop", 0.19, 0.012, 0.23, iceWhite, 0, 0.172, 0));
  ic.add(box("IceGripSlot", 0.09, 0.01, 0.004, iceSlot, 0, 0.145, 0.111));
  ic.add(box("IceGripBar", 0.06, 0.016, 0.01, iceWhite, 0, 0.112, 0.114));
  ic.add(box("IceTrayFront", 0.176, 0.085, 0.006, clearLite, 0, 0.05, 0.112));
  ic.add(box("IceTrayRim", 0.176, 0.01, 0.012, frosted, 0, 0.092, 0.112));
  ic.add(mesh("IceMakerPrint", flipV(new THREE.PlaneGeometry(0.15, 0.024)), iceMakerPrint, 0, 0.064, 0.1155));
  cab.add(ic);
  for (let i = 0; i < 9; i++) cab.add(box("FloorGrille", 0.026, 0.003, 0.005, grille, -0.16 + i * 0.0385 + 0.05, 1.2, zShelfF - 0.06));
}
if (!process.env.NOSTOCK) stock.freezer(cab, { zIn1: zBackIn, floor: 1.2, top: 1.455 });

// ── doors: hinged on the right; the photo-textured front, dark edges, a recessed handle on the left ──
// bins as measured on the open-door photo: floor height above the door's bottom edge, rim height, depth into the cabinet
const BINS = {
  FridgeDoor: [{ f: 0.313, h: 0.141, d: 0.09 }, { f: 0.705, h: 0.08, d: 0.075, twin: true }, { f: 0.961, h: 0.047, d: 0.07 }],
  FreezerDoor: [{ f: 0.092, h: 0.106, d: 0.085 }, { f: 0.358, h: 0.075, d: 0.075 }],
};
function door(name, y0, h, frontMat) {
  const pivot = group(name, W / 2, y0, zFront);
  const pw = W - 0.002;
  const geo = flipV(new THREE.BoxGeometry(pw, h, doorT));
  pivot.add(mesh(name + "Panel", geo, [doorEdge, doorEdge, doorEdge, doorEdge, frontMat, liner], -pw / 2, h / 2, doorT / 2));
  // recessed handle: a vertical pocket in the free edge, 232 mm long (freezer 1279 to 1511 mm, fridge from 23 mm below the top)
  const rh = 0.232;
  const ry = name === "FreezerDoor" ? 0.247 : h - 0.023 - rh / 2;
  pivot.add(box(name + "Handle", 0.012, rh, 0.026, recess, -pw + 0.005, ry, doorT * 0.45));
  // inside: gasket, liner and bins
  pivot.add(box(name + "Gasket", pw - 0.018, h - 0.018, 0.008, gasket, -pw / 2, h / 2, -0.004));
  pivot.add(box(name + "Liner", pw - 0.07, h - 0.07, 0.012, liner, -pw / 2, h / 2, -0.01));
  const bw = pw - 0.13;
  BINS[name].forEach((b, i) => {
    const zc = -0.012 - b.d / 2;
    pivot.add(box(`${name}Bin${i}Floor`, bw, 0.004, b.d, binMat, -pw / 2, b.f + 0.002, zc));
    pivot.add(box(`${name}Bin${i}Lip`, bw, b.h * 0.85, 0.004, binMat, -pw / 2, b.f + b.h * 0.425, -0.012 - b.d + 0.002));
    pivot.add(box(`${name}Bin${i}Rim`, bw, 0.008, 0.008, frosted, -pw / 2, b.f + b.h - 0.004, -0.012 - b.d + 0.004));
    for (const sx of [-1, 1]) pivot.add(box(`${name}Bin${i}End`, 0.004, b.h, b.d, binMat, -pw / 2 + sx * (bw / 2 - 0.002), b.f + b.h / 2, zc));
    if (b.twin) {   // the double bin: a partition, and the egg-shaped bumps under its floor
      pivot.add(box(`${name}Bin${i}Part`, 0.004, b.h, b.d, binMat, -pw / 2, b.f + b.h / 2, zc));
      for (let k = 0; k < 8; k++) pivot.add(mesh("EggBump", new THREE.SphereGeometry(0.017, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), binMat, -pw / 2 - bw / 2 + 0.03 + k * (bw - 0.06) / 7, b.f + 0.002, zc));
    }
  });
  return pivot;
}
// what sits in the door bins, so it swings out with the door
function stockDoor(pivot, name) {
  if (process.env.NOSTOCK) return;
  const B = BINS[name];
  if (name === "FridgeDoor") {
    // three bins: jars in the shallow top one, eggs in the double one, bottles in the big one (no cans on this door)
    stock.doorFridge(pivot, { eggY: B[1].f, jarY: B[2].f, botY: B[0].f, canY: B[0].f });
    pivot.children.filter((c) => c.name === "Can").forEach((c) => pivot.remove(c));
  } else stock.doorFreezer(pivot, { b1: B[1].f, b2: B[0].f, n: 4, gap: 0.13 });
}
const fridgeDoor = door("FridgeDoor", doorBottom, fridgeH, fridgeFront);
const freezerDoor = door("FreezerDoor", yFreezer, freezerH, freezerFront);
stockDoor(fridgeDoor, "FridgeDoor");
stockDoor(freezerDoor, "FreezerDoor");
root.add(fridgeDoor, freezerDoor);

const parts = productParts(PRODUCTS, ID);
const clips = stateClips(root, parts);
saveZones(PRODUCTS, ID, root, parts);
await exportGLB(root, clips, OUT, {
  FreezerFront: `${TEX}/samsung/freezer-door.jpg`,
  FridgeFront: `${TEX}/samsung/fridge-door.jpg`,
  InnerPanel: `${TEX}/samsung/inner_panel.png`,
  BackFreezer: `${TEX}/samsung/back_freezer.png`,
  BackFridge: `${TEX}/samsung/back_fridge.png`,
  BigBoxPrint: `${TEX}/samsung/bigbox_print.png`,
  IceMakerPrint: `${TEX}/samsung/icemaker_print.png`,
  SideBrushed: `${TEX}/samsung/side.jpg`,
  Rear: `${TEX}/samsung/rear.jpg`,
  Bay: `${TEX}/samsung/bay.jpg`,
  ...stock.textures(),
});
