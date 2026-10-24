// LG FHP1412Z9B, 12 kg front load, Platinum Black.
// Built to LG's published size, 600 W x 850 H x 565 D mm (615 mm with the door), and the
// official photos: control strip with the detergent drawer on the left, a black tinted
// glass door hinged on the left, stainless drum, filter cover bottom right.
// usage: node make_lg_fhp1412.mjs <products.json> <tex dir> <out.glb>
import fs from "node:fs";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { THREE, mat, mesh, box, faced, group, lathe, frontWithHoles, flipV, inward, stateClips, exportGLB, productParts, saveZones } from "./lib.mjs";

const [PRODUCTS, TEX, OUT] = process.argv.slice(2);
const ID = "lg-fhp1412z9b";

// ── size (metres); photo measurements at 1 px per mm ──
const W = 0.6, H = 0.85, D = 0.565;
const zF = D / 2, zB = -D / 2;
const feet = 0.014, frontTop = 0.745;                     // the lower front panel starts at 0.745
const stripY = 0.85 - 404 / 3.61 / 1000;                 // 0.7381: the control strip is 112 mm tall (rows 150-554 of LG's panel photo, 3.61 px/mm) and overlaps the front below
const drawerX0 = -0.299, drawerX1 = -0.09;
const cx = 0.005, cy = 0.469, ringR = 0.26, holeR = 0.2;   // door centre and sizes

// ── materials ──
const side = mat("BodySide", 0xffffff, { metal: 0.5, rough: 0.42 });
const front = mat("Front", 0xffffff, { metal: 0.42, rough: 0.4 });
const panel = mat("Panel", 0xffffff, { metal: 0.15, rough: 0.3 });
const drawerFront = mat("DrawerFront", 0xffffff, { metal: 0.15, rough: 0.3 });
const tray = mat("Tray", 0xffffff, { rough: 0.5 });
const trayBody = mat("TrayBody", 0xe9ebed, { rough: 0.55 });
const dark = mat("Dark", 0x0b0c0d, { rough: 0.8 });
const chrome = mat("Chrome", 0xc4c7cb, { metal: 1, rough: 0.18 });
const ringBlack = mat("RingBlack", 0x121315, { metal: 0.3, rough: 0.22 });
const tint = mat("TintedGlass", 0x101418, { metal: 0.2, rough: 0.04, opacity: 0.8 });
const bowl = mat("GlassBowl", 0x9aa3aa, { rough: 0.05, opacity: 0.28, side: THREE.DoubleSide });
const doorBack = mat("DoorBack", 0x2b2c30, { rough: 0.6 });
const gasket = mat("Gasket", 0x26272a, { rough: 0.85 });
const drum = mat("Drum", 0xffffff, { metal: 0.85, rough: 0.32 });
const steel = mat("Steel", 0xb9bcc0, { metal: 0.9, rough: 0.28 });
const footMat = mat("Foot", 0x8d9094, { metal: 0.6, rough: 0.4 });
const back = mat("Back", 0x24252a, { rough: 0.7 });
// the top plate is dark glossy metal in the photos; BodySide's metal setting made it mirror the sky
const topMat = mat("TopPlate", 0xffffff, { metal: 0.2, rough: 0.5 });
// rotary selector: black skirt, chrome edge, brushed-aluminium top
const knobSkirt = mat("KnobSkirt", 0x0e0e10, { metal: 0.35, rough: 0.25 });
const knobEdge = mat("KnobEdge", 0xb9bcc2, { metal: 1, rough: 0.2 });
const btnPower = mat("BtnPower", 0xffffff, { metal: 0.2, rough: 0.35 });
const btnPlay = mat("BtnPlay", 0xffffff, { metal: 0.2, rough: 0.35 });
const keyPad = mat("Keys", 0xffffff, { metal: 0.1, rough: 0.35 });
const knobTop = mat("KnobTop", 0xffffff, { metal: 0.55, rough: 0.38 });

// ── rear fittings: positions traced from LG's rear photo by tex_lg_rear.py (metres, front view) ──
const rp = JSON.parse(fs.readFileSync(`${TEX}/lg/rear_paths.json`, "utf8"));
const sideL = mat("SideL", 0xffffff, { metal: 0.3, rough: 0.5 });
const sideR = mat("SideR", 0xffffff, { metal: 0.3, rough: 0.5 });
const rearMat = mat("Rear", 0xffffff, { metal: 0.15, rough: 0.6 });
const plateMat = mat("TubPlate", 0xffffff, { metal: 0.5, rough: 0.45 });
const hoseMat = mat("Hose", 0xffffff, { rough: 0.7 });
const cordMat = mat("Cord", 0x8a8d91, { rough: 0.6 });
const plugMat = mat("Plug", 0x7d8084, { rough: 0.55 });
const boltMat = mat("Bolt", 0xaeb2b7, { metal: 0.9, rough: 0.3 });
const rubberMat = mat("Rubber", 0x151618, { rough: 0.9 });

const root = group("LGFHP1412");
const cab = group("Cabinet");
root.add(cab);

// ── cabinet: brushed platinum-black sides and top ──
const t = 0.012, bodyH = H - feet, midY = feet + bodyH / 2;
cab.add(mesh("SideLeft", flipV(new THREE.BoxGeometry(t, bodyH, D - 0.004)), [dark, sideL, side, side, side, side], -W / 2 + t / 2, midY, -0.002));
cab.add(mesh("SideRight", flipV(new THREE.BoxGeometry(t, bodyH, D - 0.004)), [sideR, dark, side, side, side, side], W / 2 - t / 2, midY, -0.002));
cab.add(faced("Top", W, t, D, [topMat, topMat, topMat, dark, topMat, topMat], 0, H - t / 2, 0));
cab.add(box("Base", W - 2 * t, t, D - 0.01, back, 0, feet + t / 2, -0.005));
cab.add(mesh("BackPanel", flipV(new THREE.BoxGeometry(W, 0.828, 0.006)), [back, back, back, back, back, rearMat], 0, 0.428, zB + 0.003));
{ // raised steel tub plate (rounded rectangle, outer face = the rear photo's plate), about 30 mm proud (estimated)
  const [[ax, ay], [bx, by]] = rp.plate;           // (x of the right side, y of the bottom) and (x of the left side, y of the top)
  const w = Math.abs(ax - bx), h = Math.abs(by - ay), r = 0.034, d = 0.030;
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2);
  sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 10 });
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, 1 - (pos.getY(i) + h / 2) / h);
  const plate = mesh("TubPlate", g, plateMat, (ax + bx) / 2, (ay + by) / 2, zB);
  plate.rotation.y = Math.PI;                       // outer face toward the back, left-right as the photo shows it
  cab.add(plate);
}
for (const [bx, by] of rp.bolts) { // transit-bolt caps with their bolt heads
  cab.add(mesh("BoltRing", new THREE.CylinderGeometry(0.0195, 0.0195, 0.006, 28), rubberMat, bx, by, zB - 0.003).rotateX(Math.PI / 2));
  const cap = mesh("BoltCap", new THREE.CylinderGeometry(0.016, 0.016, 0.012, 28), boltMat, bx, by, zB - 0.009); cap.rotation.x = Math.PI / 2; cab.add(cap);
  const head = mesh("BoltHead", new THREE.CylinderGeometry(0.0062, 0.0062, 0.007, 6), boltMat, bx, by, zB - 0.0165); head.rotation.x = Math.PI / 2; cab.add(head);
}
{ // drain hose, ribbed grey, about 20 mm across; its end fitting at the right
  const pts = rp.hose.map(([x, y]) => new THREE.Vector3(x, y, zB - 0.020));
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const g = new THREE.TubeGeometry(curve, 240, rp.hose_d / 2, 10, false);
  const uv = g.attributes.uv, ribs = curve.getLength() / 0.0043;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * ribs);
  cab.add(mesh("DrainHose", g, hoseMat));
  const e = pts[pts.length - 1];
  cab.add(mesh("HoseFitting", new THREE.CylinderGeometry(0.0145, 0.0145, 0.04, 20), plugMat, e.x, e.y - 0.012, e.z));
}
{ // power cord: from the grommet to the tied loop, round the loop, then down to the plug
  const zFor = (x, y) => (x > Math.min(rp.plate[0][0], rp.plate[1][0]) && x < Math.max(rp.plate[0][0], rp.plate[1][0]) &&
    y > Math.min(rp.plate[0][1], rp.plate[1][1]) && y < Math.max(rp.plate[0][1], rp.plate[1][1])) ? zB - 0.0345 : zB - 0.008;
  const run = (list, dz = 0) => list.map(([x, y]) => new THREE.Vector3(x, y, zFor(x, y) - dz));
  const tube = (name, pts) => cab.add(mesh(name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), 110, rp.cord_d / 2, 6, false), cordMat));
  tube("CordToTie", run(rp.cord));
  tube("CordLoop", run(rp.loop, 0.006));
  tube("CordDown", run(rp.drop));
  const [px, py] = rp.plug;
  const ps = new THREE.Shape();
  ps.moveTo(0, 0.027); ps.bezierCurveTo(0.012, 0.021, 0.027, -0.008, 0.026, -0.017); ps.quadraticCurveTo(0, -0.032, -0.026, -0.017);
  ps.bezierCurveTo(-0.027, -0.008, -0.012, 0.021, 0, 0.027);
  const pg = new THREE.ExtrudeGeometry(ps, { depth: 0.016, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 3, curveSegments: 14 });
  const plug = mesh("Plug", pg, plugMat, px, py - 0.004, zB - 0.004);
  plug.rotation.y = Math.PI;
  cab.add(plug);
}
for (const [fx, fz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
  cab.add(mesh("Foot", new THREE.CylinderGeometry(0.018, 0.02, feet, 18), footMat, fx * (W / 2 - 0.04), feet / 2, fz * (D / 2 - 0.05)));
}

// ── front: photo of LG's own front with the porthole cut out ──
const mainFront = frontWithHoles("FrontMain", W, frontTop - feet, [{ x: cx, y: cy - feet, r: holeR }], front, 0.004);
mainFront.position.set(0, feet, zF - 0.004);
cab.add(mainFront);
// control strip: dial, programmes and display, right of the drawer
const stripW = W / 2 - drawerX1, stripH = H - stripY;
cab.add(mesh("ControlStrip", flipV(new THREE.BoxGeometry(stripW, stripH, 0.012)), [side, side, side, side, panel, side], drawerX1 + stripW / 2, stripY + stripH / 2, zF - 0.006 + 0.0004));
// the drawer bay: a dark slot the drawer slides out of
const bayW = drawerX1 - drawerX0;
cab.add(mesh("DrawerBay", inward(new THREE.BoxGeometry(bayW, stripH - 0.004, 0.3)), dark, drawerX0 + bayW / 2, stripY + stripH / 2, zF - 0.15));

// ── detergent drawer: LG's photographed front and a white tray behind it ──
const drawer = group("Drawer", drawerX0 + bayW / 2, stripY + stripH / 2, zF - 0.006);
drawer.add(mesh("DrawerFace", flipV(new RoundedBoxGeometry(bayW - 0.002, stripH - 0.002, 0.012, 2, 0.004)), [side, side, side, side, drawerFront, side], 0, 0, 0));
{ // the white tray behind the face: floor, walls, a divider, the lattice insert on the left and the blue lid on the right.
  // LG's photos show these from one angle only, so the compartment sizes are estimates.
  const trayW = bayW - 0.02, trayH = stripH - 0.034, trayL = 0.262, z1 = -0.012 - trayL, zc = -0.012 - trayL / 2;
  const white2 = mat("TrayWhite", 0xf1f3f5, { rough: 0.5 });
  const blue = mat("TrayBlue", 0x78a8f0, { rough: 0.2, opacity: 0.55 });
  const blueDark = mat("TrayBlueDark", 0x2d5fb5, { rough: 0.35 });
  const floorMat = mat("TrayFloor", 0xc9ced3, { rough: 0.6 });
  const y0 = -0.004, wt = 0.0028;
  drawer.add(box("TrayFloor", trayW, wt, trayL, floorMat, 0, y0 - trayH / 2 + wt / 2, zc));
  drawer.add(box("TrayWallL", wt, trayH, trayL, white2, -trayW / 2 + wt / 2, y0, zc));
  drawer.add(box("TrayWallR", wt, trayH, trayL, white2, trayW / 2 - wt / 2, y0, zc));
  drawer.add(box("TrayWallBack", trayW, trayH, wt, white2, 0, y0, z1 + wt / 2));
  const xd = -trayW / 2 + trayW * 0.56;                                           // divider between the big left compartment and the right ones
  drawer.add(box("TrayDivider", wt, trayH * 0.9, trayL * 0.94, white2, xd, y0 - trayH * 0.05, zc));
  const xm = (xd + trayW / 2) / 2;                                                 // right-hand compartment centre
  drawer.add(box("TrayCross", trayW / 2 - xd - wt, trayH * 0.8, wt, white2, xm, y0 - trayH * 0.1, zc - trayL * 0.1));
  drawer.add(box("TrayBlueLid", trayW / 2 - xd - 2 * wt, 0.003, trayL * 0.42, blue, xm, y0 + trayH / 2 - 0.006, z1 + trayL * 0.3));
  drawer.add(box("TrayBlueCap", 0.032, 0.012, 0.03, blueDark, xm, y0 - trayH / 2 + 0.01, zc + trayL * 0.12));
  for (let i = 0; i < 4; i++) drawer.add(box(`TrayLattice${i}`, 0.0025, trayH * 0.72, trayL * 0.3, white2, -trayW / 2 + 0.018 + i * 0.016, y0 - trayH * 0.1, z1 + trayL * 0.2));
}
cab.add(drawer);

// ── rotary selector: a raised black knob with a brushed-aluminium top in a chrome-edged surround ──
// Centre and sizes measured on LG's straight-on photo of the panel (3.61 px/mm): the ring is 73 mm across, the knob
// top 59 mm, the centre 5 mm right of the middle and 61 mm below the top edge. The knob's height (12.5 mm) is an
// estimate from the 3/4 photos, not a published figure.
const dial = group("Dial", 0.0053, 0.7915, zF);
dial.add(lathe("DialRing", [[0.0364, 0], [0.0364, 0.0012], [0.0375, 0.0012], [0.0375, 0]], knobEdge, 64));
dial.add(lathe("KnobSkirt", [[0.0, 0.0], [0.0302, 0.0], [0.0302, 0.0104], [0.0286, 0.0121], [0.0, 0.0121]], knobSkirt, 64));
dial.add(lathe("KnobEdge", [[0.0286, 0.0121], [0.0273, 0.0125], [0.0271, 0.0123], [0.0284, 0.0119]], knobEdge, 64));
dial.add(mesh("KnobTop", new THREE.CircleGeometry(0.0285, 64), knobTop, 0, 0, 0.0125));
cab.add(dial);

// ── buttons: two round push buttons with chrome rings, and the five touch keys under the display ──
// Positions measured on LG's straight-on panel photo (3.61 px/mm, x from the left edge, y down from the top edge);
// how far they stand out (3 mm, 1.2 mm) is estimated.
const mx = (ph) => (ph - 4) / 3.61 / 1000 - 0.3, my = (ph) => 0.85 - (ph - 150) / 3.61 / 1000;
for (const [name, ex, ey, m] of [["PowerButton", 876, 479, btnPower], ["StartButton", 1320, 481, btnPlay]]) {
  const b = group(name, mx(ex), my(ey), zF);
  b.add(lathe(name + "Ring", [[0.0106, 0], [0.0106, 0.0022], [0.0096, 0.0024], [0.0096, 0]], knobEdge, 64));
  b.add(lathe(name + "Cap", [[0, 0], [0.0092, 0], [0.0092, 0.0027], [0.0086, 0.0031], [0, 0.0031]], knobSkirt, 64));
  b.add(mesh(name + "Face", new THREE.CircleGeometry(0.0084, 48), m, 0, 0, 0.00315));
  cab.add(b);
}
{ // touch keys: one raised bar, its face the same strip texture so the labels sit on the keys
  const x0 = mx(1499), x1 = mx(2074), y0 = my(418), y1 = my(469);          // photo columns 1499-2074, rows 418-469
  const g = new THREE.BoxGeometry(x1 - x0, y0 - y1, 0.0012);
  const uv = g.attributes.uv;
  for (let i = 16; i < 20; i++) { // the +Z face, mapped to where the keys are on the strip texture (390 x 105 mm)
    const u = uv.getX(i), v = uv.getY(i);
    uv.setXY(i, (x0 + u * (x1 - x0) - drawerX1) / stripW, (H - (y1 + v * (y0 - y1))) / stripH);
  }
  cab.add(mesh("TouchKeys", g, [dark, dark, dark, dark, panel, dark], (x0 + x1) / 2, (y0 + y1) / 2, zF + 0.0006));
}

// ── gasket and stainless drum behind the porthole ──
const gasketRing = lathe("GasketRing", [[holeR + 0.004, 0.004], [holeR - 0.006, -0.012], [holeR - 0.016, -0.05], [holeR - 0.02, -0.075]], gasket);
gasketRing.position.set(cx, cy, zF - 0.004);
cab.add(gasketRing);
const drumR = 0.235, drumDepth = 0.33, drumZ = zF - 0.08 - drumDepth / 2;
const drumGeo = inward(new THREE.CylinderGeometry(drumR, drumR, drumDepth, 64, 1, true));
drumGeo.rotateX(Math.PI / 2);
cab.add(mesh("DrumShell", drumGeo, drum, cx, cy, drumZ));
const drumBackGeo = new THREE.CircleGeometry(drumR, 64);
cab.add(mesh("DrumBack", drumBackGeo, steel, cx, cy, drumZ - drumDepth / 2 + 0.002));
// drum front lip, narrowing to the gasket
cab.add(lathe("DrumLip", [[drumR, 0], [holeR - 0.02, 0.01]], steel).translateX(cx).translateY(cy).translateZ(drumZ + drumDepth / 2));
for (let i = 0; i < 3; i++) {
  const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
  const lifter = box(`Lifter${i}`, 0.05, 0.022, drumDepth - 0.04, steel, cx + Math.cos(a) * (drumR - 0.012), cy + Math.sin(a) * (drumR - 0.012), drumZ);
  lifter.rotation.z = a + Math.PI / 2;
  cab.add(lifter);
}

// ── door: hinged on the left; chrome rim, glossy black ring, black tinted glass ──
const doorZ = 0.050 / 0.057;                                 // LG: 615 mm deep with the door, 565 mm body: 50 mm proud
const door = group("Door", cx - ringR, cy, zF);
const dc = group("DoorCentre", ringR, 0, 0);
door.add(dc);
dc.scale.z = doorZ;
dc.add(lathe("DoorBackRing", [[holeR - 0.01, 0], [ringR, 0]], doorBack));
dc.add(lathe("DoorRim", [[ringR, 0], [ringR + 0.002, 0.012], [ringR - 0.002, 0.03], [ringR - 0.012, 0.038]], chrome));
dc.add(lathe("DoorRing", [[ringR - 0.012, 0.038], [ringR - 0.03, 0.046], [0.214, 0.049], [0.205, 0.05]], ringBlack));
dc.add(lathe("DoorGlass", [[0.205, 0.05], [0.15, 0.054], [0.08, 0.056], [0.0, 0.057]], tint));
dc.add(lathe("DoorBowl", [[0.19, 0.0], [0.165, -0.05], [0.11, -0.085], [0.0, -0.095]], bowl));
root.add(door);

const parts = productParts(PRODUCTS, ID);
const clips = stateClips(root, parts);
saveZones(PRODUCTS, ID, root, parts);
await exportGLB(root, clips, OUT, {
  BodySide: `${TEX}/lg/side.jpg`,
  SideL: `${TEX}/lg/side_l.jpg`,
  SideR: `${TEX}/lg/side_r.jpg`,
  Rear: `${TEX}/lg/rear.jpg`,
  TubPlate: `${TEX}/lg/tubplate.jpg`,
  Hose: `${TEX}/lg/hose.jpg`,
  Front: `${TEX}/lg/front.jpg`,
  Panel: `${TEX}/lg/panel.jpg`,
  KnobTop: `${TEX}/lg/knob_top.jpg`,
  BtnPower: `${TEX}/lg/btn_power.jpg`,
  BtnPlay: `${TEX}/lg/btn_play.jpg`,
  TopPlate: `${TEX}/lg/side.jpg`,
  DrawerFront: `${TEX}/lg/drawer.jpg`,
  Drum: `${TEX}/lg/drum.jpg`,
});
