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
const liner = mat("Liner", 0xdfe2e5, { rough: 0.72 });
const trim = mat("Trim", 0xb9bec4, { rough: 0.4 });
const glass = mat("Glass", 0xcfe3ea, { rough: 0.05, opacity: 0.45 });
const binMat = mat("Bin", 0xcfe0ea, { rough: 0.15, opacity: 0.62 });
const frosted = mat("Frosted", 0xe6edf1, { rough: 0.45, opacity: 0.78 });
const gasket = mat("Gasket", 0xb8bcc0, { rough: 0.85 });
const light = mat("Light", 0xffffff, { emissive: 0xf4f8ff, emissiveIntensity: 1.4 });
const panelMat = mat("InnerPanel", 0xffffff, { rough: 0.45 });
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
cab.add(mesh("RearPanel", flipV(new THREE.BoxGeometry(W, rearH, 0.004)), [back, back, back, back, back, rearMat], 0, bayTop + rearH / 2, zBack + 0.002));
// the open compressor bay below it: dark walls, ceiling and floor, and the photographed machinery on its back wall
const bayH = bayTop - floorTop, bayW = W - 2 * wall;
cab.add(box("BayCeiling", bayW, 0.01, bayD, bayDark, 0, bayTop + 0.005, zBack + bayD / 2));
cab.add(box("BayFloor", bayW, 0.004, bayD, bayDark, 0, floorTop + 0.002, zBack + bayD / 2));
cab.add(box("BaySideL", 0.004, bayH, bayD, bayDark, -bayW / 2 + 0.002, floorTop + bayH / 2, zBack + bayD / 2));
cab.add(box("BaySideR", 0.004, bayH, bayD, bayDark, bayW / 2 - 0.002, floorTop + bayH / 2, zBack + bayD / 2));
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
cab.add(box("Divider", W - 2 * wall, 0.05, Dc - wall, liner, 0, yDiv, zMid + wall / 2));
cab.add(box("DividerTrim", W - 2 * wall, 0.008, 0.004, silver, 0, yDiv, zFront - 0.001));
cab.add(box("Plinth", W - 0.03, doorBottom - feet - 0.002, 0.012, foot, 0, feet + (doorBottom - feet) / 2, zFront - 0.008));
cab.add(box("PlinthTab", 0.05, feet, 0.03, foot, 0, feet / 2, zFront - 0.02));
for (const [fx, fz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
  cab.add(mesh("Foot", new THREE.CylinderGeometry(0.017, 0.019, feet, 20), foot, fx * (W / 2 - 0.035), feet / 2, zMid + fz * (Dc / 2 - 0.035)));
}

// ── fridge inside: crisper drawer, two tempered glass shelves, light and controls ──
const inW = W - 2 * wall - 0.006, inD = Dc - wall - 0.11, inZ = zBack + wall + inD / 2 + 0.01;
// the crisper stops short of the compressor bay's step at the rear
const stepIn = bayD + 0.015 - (wall + 0.01), inDc = inD - stepIn, inZc = inZ + stepIn / 2;
cab.add(box("CrisperFront", inW - 0.02, 0.2, 0.008, frosted, 0, floorTop + 0.11, inZc + inDc / 2 - 0.004));
cab.add(box("CrisperTrim", inW - 0.02, 0.016, 0.012, trim, 0, floorTop + 0.205, inZc + inDc / 2 - 0.004));
cab.add(box("CrisperSideL", 0.006, 0.2, inDc - 0.02, binMat, -inW / 2 + 0.012, floorTop + 0.11, inZc));
cab.add(box("CrisperSideR", 0.006, 0.2, inDc - 0.02, binMat, inW / 2 - 0.012, floorTop + 0.11, inZc));
cab.add(box("CrisperLid", inW, 0.008, inDc, glass, 0, floorTop + 0.23, inZc));
for (const [i, y] of [[1, 0.56], [2, 0.82]]) {
  cab.add(box(`Shelf${i}`, inW, 0.007, inD, glass, 0, y, inZ));
  cab.add(box(`ShelfTrim${i}`, inW, 0.016, 0.012, trim, 0, y, inZ + inD / 2));
}
cab.add(box("FridgeLight", 0.2, 0.008, 0.05, light, 0, yDiv - 0.03, zFront - 0.12));
const panelGeo = new THREE.PlaneGeometry(0.14, 0.087);
const panel = mesh("InnerPanelFace", flipV(panelGeo), panelMat, W / 2 - wall - 0.001, yDiv - 0.12, zFront - 0.2);
panel.rotation.y = -Math.PI / 2;
cab.add(panel);

// back-wall air vents (Multi Flow)
cab.add(box("FridgeVents", 0.16, 0.5, 0.01, trim, 0, 0.7, zBack + wall + 0.005));
cab.add(box("FreezerVents", 0.16, 0.2, 0.01, trim, 0, yFreezer + 0.3, zBack + wall + 0.005));

// ── groceries (stock_lg.mjs, food.mjs): vegetarian South Indian food, eggs, juices, water and soft drinks ──
const stock = LGStock({ T3: `${TEX}/lg_glt3426`, TF: `${TEX}/food` });
const zBackIn = inZ - inD / 2;
stock.shelves(cab, { zIn1: zBackIn, s1: 0.82, s2: 0.56, s3: null, fz: floorTop + 0.01, vz0: inZc - inDc / 2 + 0.05, vk: (inDc - 0.08) / 0.56 });

// ── freezer inside: one shelf and the twist ice maker ──
cab.add(box("FreezerShelf", inW, 0.01, inD, frosted, 0, yFreezer + 0.24, inZ));
cab.add(box("IceMaker", 0.3, 0.05, 0.14, liner, -0.08, H - wall - 0.04, zBack + wall + 0.12));
cab.add(box("IceTray", 0.28, 0.02, 0.12, trim, -0.08, H - wall - 0.075, zBack + wall + 0.12));
stock.freezer(cab, { zIn1: zBackIn, floor: yFreezer + 0.002, top: yFreezer + 0.245 });

// ── doors: hinged on the right; the photo-textured front, dark edges, a recessed handle on the left ──
function door(name, y0, h, frontMat, bins) {
  const pivot = group(name, W / 2, y0, zFront);
  const pw = W - 0.002;
  const geo = flipV(new THREE.BoxGeometry(pw, h, doorT));
  pivot.add(mesh(name + "Panel", geo, [doorEdge, doorEdge, doorEdge, doorEdge, frontMat, liner], -pw / 2, h / 2, doorT / 2));
  // recessed handle: a dark pocket in the free edge
  const rh = name === "FreezerDoor" ? 0.26 : 0.34;
  const ry = name === "FreezerDoor" ? 0.05 + rh / 2 : h - 0.05 - rh / 2;
  pivot.add(box(name + "Handle", 0.012, rh, 0.026, recess, -pw + 0.005, ry, doorT * 0.45));
  // inside: gasket, liner and bins
  pivot.add(box(name + "Gasket", pw - 0.018, h - 0.018, 0.008, gasket, -pw / 2, h / 2, -0.004));
  pivot.add(box(name + "Liner", pw - 0.07, h - 0.07, 0.012, liner, -pw / 2, h / 2, -0.01));
  bins.forEach((b, i) => {
    pivot.add(box(`${name}Bin${i}`, pw - 0.13, 0.08, 0.085, binMat, -pw / 2, b, -0.06));
    pivot.add(box(`${name}BinBase${i}`, pw - 0.13, 0.006, 0.085, trim, -pw / 2, b - 0.04, -0.06));
  });
  return pivot;
}
// what sits in the door bins, so it swings out with the door
function stockDoor(pivot, name, bins) {
  if (name === "FridgeDoor") stock.doorFridge(pivot, { eggY: bins[3] - 0.04, jarY: bins[1] - 0.04, botY: bins[0] - 0.04, canY: bins[2] - 0.04 });
  else stock.doorFreezer(pivot, { b1: bins[1] - 0.04, b2: bins[0] - 0.04, n: 4, gap: 0.13 });
}
const fridgeBins = [0.16, 0.42, 0.68, 0.93], freezerBins = [0.14, 0.36];
const fridgeDoor = door("FridgeDoor", doorBottom, fridgeH, fridgeFront, fridgeBins);
const freezerDoor = door("FreezerDoor", yFreezer, freezerH, freezerFront, freezerBins);
stockDoor(fridgeDoor, "FridgeDoor", fridgeBins);
stockDoor(freezerDoor, "FreezerDoor", freezerBins);
root.add(fridgeDoor, freezerDoor);

const parts = productParts(PRODUCTS, ID);
const clips = stateClips(root, parts);
saveZones(PRODUCTS, ID, root, parts);
await exportGLB(root, clips, OUT, {
  FreezerFront: `${TEX}/samsung/freezer-door.jpg`,
  FridgeFront: `${TEX}/samsung/fridge-door.jpg`,
  InnerPanel: `${TEX}/samsung/inner-panel.jpg`,
  SideBrushed: `${TEX}/samsung/side.jpg`,
  Rear: `${TEX}/samsung/rear.jpg`,
  Bay: `${TEX}/samsung/bay.jpg`,
  ...stock.textures(),
});
