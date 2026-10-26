// LG FHB1208Z2M, 8 kg front load, Middle Black.
// Built to LG's published size, 600 W x 850 H x 550 D mm (590 mm to the front of the door, 1030 mm with the door open at 90 degrees),
// and LG's own photos: the detergent drawer with its finger pocket at the left of the control strip, the dial, the LED display and the
// touch keys; a black tinted round door hinged on the left; the stainless embossed drum with three lifters; a small cover at the bottom
// right over the drain plug and the pump filter; five embossed ribs on each side; the back with its tub plate, transit bolts, drain hose,
// power cord loop and plug. Positions come from the front photo (1.178 px/mm), the side photos (1.358 px/mm) and the rear photo (1.362 px/mm).
// usage: node make_lg_fhb1208.mjs <entries json> <tex dir> <out.glb>
import fs from "node:fs";
import { THREE, mat, mesh, box, faced, group, lathe, flipV, inward, stateClips, exportGLB, productParts, saveZones } from "./lib.mjs";

const [PRODUCTS, TEX, OUT] = process.argv.slice(2);
const ID = "lg-fhb1208z2m";
const T = `${TEX}/lg_fhb1208`;

// ── size (metres) ──
const W = 0.6, H = 0.85, D = 0.55;
const zF = D / 2, zB = -D / 2;
const feet = 0.014, stripH = 0.089, stripY = H - stripH;     // the control strip is 89 mm tall (measured on the front photo)
const drawerW = 0.212, panelW = W - drawerW;
const cx = 0, cy = 0.492, ringR = 0.247, holeR = 0.2;        // the door: centre and radii (front photo)
const hingeZ = zF - 0.02;                                    // the door's hinge axis sits 20 mm behind the front: 590 mm deep with the door
const flapC = { x: 0.193, y: 0.121, w: 0.148, h: 0.102 };    // the cover over the pump filter (front photo: 148 x 102 mm)

// ── materials ──
const plate = mat("Front", 0xffffff, { rough: 0.5 });
const sideR = mat("SideR", 0xffffff, { rough: 0.55 });
const sideL = mat("SideL", 0xffffff, { rough: 0.55 });
const rearM = mat("Rear", 0xffffff, { rough: 0.6 });
const panelM = mat("Panel", 0xffffff, { rough: 0.3 });
const drawerM = mat("DrawerFace", 0xffffff, { rough: 0.4 });
const topM = mat("TopPlate", 0x3f3f42, { rough: 0.55, metal: 0.1 });
const bodyDark = mat("BodyDark", 0x353537, { rough: 0.6 });
const dark = mat("Dark", 0x0b0c0d, { rough: 0.8 });
const pocketM = mat("Pocket", 0x151517, { rough: 0.7 });
const lipM = mat("PocketLip", 0x5a5a5e, { rough: 0.35, metal: 0.2 });
const trayM = mat("TrayWhite", 0xf1f3f5, { rough: 0.5 });
const trayFloor = mat("TrayFloor", 0xc9ced3, { rough: 0.6 });
const trayBlue = mat("TrayBlue", 0x4a86e0, { rough: 0.3 });
const chrome = mat("Chrome", 0xb9bcc2, { metal: 1, rough: 0.2 });
const knobSkirt = mat("KnobSkirt", 0x151517, { metal: 0.4, rough: 0.28 });
const knobTop = mat("KnobTop", 0xffffff, { metal: 0.6, rough: 0.35 });
const seat = mat("DoorSeat", 0x2e2e30, { rough: 0.55 });
const gasketM = mat("Gasket", 0x6c7380, { rough: 0.85 });
const doorIn = mat("DoorInner", 0x2a2b2e, { rough: 0.55 });
const rimM = mat("DoorRim", 0x6f7076, { metal: 0.8, rough: 0.3 });
const ringBlack = mat("DoorBlack", 0x050506, { metal: 0.3, rough: 0.14 });
const glass = mat("DoorGlass", 0x14181c, { rough: 0.04, opacity: 0.2, side: THREE.DoubleSide });
const bowl = mat("GlassBowl", 0x7f8b96, { rough: 0.05, opacity: 0.14, side: THREE.DoubleSide });
const drum = mat("Drum", 0xffffff, { metal: 0.85, rough: 0.34 });
const steel = mat("Steel", 0xb9bcc0, { metal: 0.9, rough: 0.3 });
const lifterM = mat("Lifter", 0x7d8187, { metal: 0.6, rough: 0.4 });
const backGrey = mat("DrumBack", 0x34383d, { metal: 0.7, rough: 0.45 });
const footM = mat("Foot", 0x9a9da2, { metal: 0.6, rough: 0.4 });
const flapM = mat("FlapFace", 0x333335, { rough: 0.5 });
const filterM = mat("FilterCap", 0x8d9096, { rough: 0.55 });
const bayM = mat("Bay", 0x101113, { rough: 0.75 });
const hoseM = mat("Hose", 0xffffff, { rough: 0.7 });
const cordM = mat("Cord", 0x8a8d91, { rough: 0.6 });
const plugM = mat("Plug", 0x7d8084, { rough: 0.55 });
const boltM = mat("Bolt", 0xaeb2b7, { metal: 0.9, rough: 0.3 });
const rubberM = mat("Rubber", 0x151618, { rough: 0.9 });
const blueM = mat("InletCap", 0x2c78d8, { rough: 0.5 });
const stickTop = mat("StickerTop", 0xffffff, { rough: 0.6 });
const stickSide = mat("StickerSide", 0xffffff, { rough: 0.6 });
const labelM = mat("LabelBEE", 0xffffff, { rough: 0.5, side: THREE.DoubleSide }); labelM.transparent = true; labelM.alphaTest = 0.5;

const root = group("LGFHB1208");
const cab = group("Cabinet");
root.add(cab);

// ── cabinet ──
// sides carry LG's embossed ribs (the photo is the texture): from 7 mm under the top plate down to 30 mm above the floor
const sideTop = H - 0.007, sideBot = 0.03, sideH = sideTop - sideBot, t = 0.012;
cab.add(mesh("SideLeft", flipV(new THREE.BoxGeometry(t, sideH, D)), [bodyDark, sideL, bodyDark, bodyDark, bodyDark, bodyDark], -W / 2 + t / 2, sideBot + sideH / 2, 0));
cab.add(mesh("SideRight", flipV(new THREE.BoxGeometry(t, sideH, D)), [sideR, bodyDark, bodyDark, bodyDark, bodyDark, bodyDark], W / 2 - t / 2, sideBot + sideH / 2, 0));
cab.add(box("Top", W, 0.012, D, topM, 0, H - 0.006, 0));
cab.add(box("Base", W - 2 * t, sideBot - feet, D - 0.01, dark, 0, feet + (sideBot - feet) / 2, -0.005));
cab.add(box("Skirt", W, sideBot - feet, 0.004, bodyDark, 0, feet + (sideBot - feet) / 2, zB + 0.002));
// the back: LG's rear photo (hoses and cord removed from it) on a flat panel
{
  const g = flipV(new THREE.PlaneGeometry(W, H));
  const back = mesh("BackPanel", g, rearM, 0, H / 2, zB - 0.0005);
  back.rotation.y = Math.PI;
  cab.add(back);
}
for (const [fx, fz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
  const f = group("Foot", fx * (W / 2 - 0.03), 0, fz * (D / 2 - 0.04));
  f.add(mesh("FootThread", new THREE.CylinderGeometry(0.0055, 0.0055, feet + 0.004, 12), steel, 0, (feet + 0.004) / 2 - 0.004 + 0.002, 0));
  f.add(mesh("FootPad", new THREE.CylinderGeometry(0.015, 0.016, 0.006, 20), footM, 0, 0.003, 0));
  cab.add(f);
}

// ── the rear fittings, traced from LG's rear photo (rear-photo pixels -> metres; photo left = the machine's +x side) ──
const rp = JSON.parse(fs.readFileSync(`${T}/rear_paths.json`, "utf8"));
const PPM = rp.px_per_mm;
const rx = (px) => W / 2 - px / PPM / 1000;
const ry = (py) => H - py / PPM / 1000;
const plateDepth = 0.012;
{ // the raised tub plate (rounded rectangle), its outer face the rear photo's plate; 12 mm proud (estimated)
  const [x0, y0, x1, y1] = rp.plate;
  const w = (x1 - x0) / PPM / 1000, h = (y1 - y0) / PPM / 1000, r = 0.034;
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2);
  sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const g = new THREE.ExtrudeGeometry(sh, { depth: plateDepth, bevelEnabled: false, curveSegments: 10 });
  g.rotateY(Math.PI);                                           // extrude toward -z, left-right as the photo shows it
  g.translate(rx((x0 + x1) / 2), ry((y0 + y1) / 2), zB - 0.0005);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (W / 2 - pos.getX(i)) / W, (H - pos.getY(i)) / H);
  cab.add(mesh("TubPlate", g, rearM));
}
for (const [px, py] of rp.bolts) { // the four transit bolts: rubber ring, cap, hex head
  const bx = rx(px), by = ry(py);
  const ring = mesh("BoltRing", new THREE.CylinderGeometry(0.0125, 0.0125, 0.005, 24), rubberM, bx, by, zB - 0.0025); ring.rotation.x = Math.PI / 2; cab.add(ring);
  const cap = mesh("BoltCap", new THREE.CylinderGeometry(0.0105, 0.0105, 0.009, 24), boltM, bx, by, zB - 0.0075); cap.rotation.x = Math.PI / 2; cab.add(cap);
  const head = mesh("BoltHead", new THREE.CylinderGeometry(0.0072, 0.0072, 0.006, 6), boltM, bx, by, zB - 0.0135); head.rotation.x = Math.PI / 2; cab.add(head);
}
const zOver = (px, py) => { // lying on the dark back, or on the tub plate
  const [x0, y0, x1, y1] = rp.plate;
  return px > x0 + 6 && px < x1 - 6 && py > y0 + 6 && py < y1 - 6 ? zB - plateDepth : zB;
};
{ // drain hose: ribbed grey, 24 mm across, from its holder at bottom left up and over the top, down the right side to the end fitting
  const pts = rp.hose.map(([px, py]) => new THREE.Vector3(rx(px), ry(py), zOver(px, py) - 0.0125));
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const g = new THREE.TubeGeometry(curve, 200, 0.0118, 8, false);
  const uv = g.attributes.uv, ribs = curve.getLength() / 0.0045;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * ribs);
  cab.add(mesh("DrainHose", g, hoseM));
  const e = pts[pts.length - 1];
  const fit = mesh("HoseFitting", new THREE.CylinderGeometry(0.0155, 0.0155, 0.036, 20), plugM, e.x, e.y - 0.004, e.z); cab.add(fit);
  const s0 = pts[0];
  cab.add(mesh("HoseEnd", new THREE.SphereGeometry(0.0118, 12, 8), hoseM, s0.x, s0.y, s0.z));
}
{ // the power cord: from the grommet over to the tie, the tied loop (with a white tie), then the long run down the right to the plug
  const run = (list, dz = 0.0045) => list.map(([px, py]) => new THREE.Vector3(rx(px), ry(py), zOver(px, py) - dz));
  const tube = (name, pts, closed = false) => cab.add(mesh(name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed, "centripetal"), 110, 0.0045, 5, closed), cordM));
  tube("CordRun", run(rp.cord));
  tube("CordLoop", run(rp.loop, 0.0075));
  const [tx, ty] = rp.loop[0];
  cab.add(mesh("CordTie", new THREE.BoxGeometry(0.008, 0.016, 0.006), mat("Tie", 0xf2f2f2, { rough: 0.6 }), rx(tx), ry(ty), zB - 0.0105));
  const [gx, gy] = rp.grommet;
  const gr = mesh("Grommet", new THREE.TorusGeometry(0.0095, 0.0035, 8, 24), plugM, rx(gx), ry(gy), zB - 0.0035); cab.add(gr);
  const [px, py] = rp.plug;
  const ps = new THREE.Shape();
  ps.moveTo(0, 0.027); ps.bezierCurveTo(0.012, 0.021, 0.027, -0.008, 0.026, -0.017); ps.quadraticCurveTo(0, -0.032, -0.026, -0.017);
  ps.bezierCurveTo(-0.027, -0.008, -0.012, 0.021, 0, 0.027);
  const pg = new THREE.ExtrudeGeometry(ps, { depth: 0.014, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 3, curveSegments: 14 });
  const plug = mesh("Plug", pg, plugM, rx(px), ry(py) - 0.002, zB - 0.004);
  plug.rotation.y = Math.PI;
  cab.add(plug);
  const [ix, iy] = rp.inlet;                                    // the water inlet: a grey seat and its blue cap
  const seatI = mesh("InletSeat", new THREE.CylinderGeometry(0.0115, 0.0115, 0.008, 20), plugM, rx(ix), ry(iy), zB - 0.004); seatI.rotation.x = Math.PI / 2; cab.add(seatI);
  const capI = mesh("InletCap", new THREE.CylinderGeometry(0.0078, 0.0078, 0.012, 20), blueM, rx(ix), ry(iy), zB - 0.012); capI.rotation.x = Math.PI / 2; cab.add(capI);
}

// ── front plate: the door seat and the pump-filter cut-out, UV-mapped to the printed plate ──
const plateH = stripY - feet;
{
  const s = new THREE.Shape();
  s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, plateH); s.lineTo(-W / 2, plateH); s.lineTo(-W / 2, 0);
  const hole = new THREE.Path(); hole.absarc(cx, cy - feet, holeR, 0, Math.PI * 2, true); s.holes.push(hole);
  const r = 0.009, x0 = flapC.x - flapC.w / 2 + 0.002, x1 = flapC.x + flapC.w / 2 - 0.002, y0 = flapC.y - flapC.h / 2 - feet + 0.002, y1 = flapC.y + flapC.h / 2 - feet - 0.002;
  const cut = new THREE.Path();
  cut.moveTo(x0 + r, y0); cut.lineTo(x1 - r, y0); cut.quadraticCurveTo(x1, y0, x1, y0 + r); cut.lineTo(x1, y1 - r); cut.quadraticCurveTo(x1, y1, x1 - r, y1);
  cut.lineTo(x0 + r, y1); cut.quadraticCurveTo(x0, y1, x0, y1 - r); cut.lineTo(x0, y0 + r); cut.quadraticCurveTo(x0, y0, x0 + r, y0);
  s.holes.push(cut);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: false, curveSegments: 96 });
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, 1 - pos.getY(i) / plateH);
  const m = mesh("FrontMain", g, plate, 0, feet, zF - 0.004);
  cab.add(m);
}
// the door seat: a darker ring round the opening, seen when the door is open
cab.add(lathe("DoorSeat", [[holeR, 0.0006], [0.235, 0.0006]], seat, 64).translateX(cx).translateY(cy).translateZ(zF));
// the pump-filter housing behind the cover: a dark box, the drain plug and the round filter cap with its grip
{
  const g = group("PumpBay", flapC.x, flapC.y, zF);
  g.add(mesh("BayBox", inward(new THREE.BoxGeometry(flapC.w - 0.008, flapC.h - 0.008, 0.07)), bayM, 0, 0, -0.035));
  const fc = mesh("FilterCap", new THREE.CylinderGeometry(0.0285, 0.0285, 0.026, 36), filterM, 0.014, -0.006, -0.032); fc.rotation.x = Math.PI / 2; g.add(fc);
  g.add(box("FilterGrip", 0.052, 0.009, 0.007, steel, 0.014, -0.006, -0.0175));
  const dp = mesh("DrainPlug", new THREE.CylinderGeometry(0.0085, 0.0085, 0.02, 16), mat("DrainPlugM", 0x2a2b2e, { rough: 0.5 }), -0.043, 0.026, -0.03); dp.rotation.x = Math.PI / 2; g.add(dp);
  const hose = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.043, 0.026, -0.04), new THREE.Vector3(-0.045, 0.012, -0.05), new THREE.Vector3(-0.036, -0.012, -0.055)]);
  g.add(mesh("PlugHose", new THREE.TubeGeometry(hose, 14, 0.004, 8, false), mat("PlugHoseM", 0x1b1c1e, { rough: 0.7 })));
  cab.add(g);
}
// the cover: a lid hinged along its lower edge, opening forward and down
{
  const f = group("FilterFlap", flapC.x, flapC.y - flapC.h / 2 + 0.002, zF + 0.0005);
  f.add(mesh("FlapLid", new THREE.BoxGeometry(flapC.w - 0.004, flapC.h - 0.004, 0.0045), [bodyDark, bodyDark, bodyDark, bodyDark, flapM, bodyDark], 0, (flapC.h - 0.004) / 2, 0.0022));
  f.add(box("FlapEdge", flapC.w - 0.012, 0.0015, 0.0012, dark, 0, flapC.h - 0.012, 0.005));
  root.add(f);
}

// ── control strip right of the drawer: the printed panel, a raised face; a seam under the whole strip ──
{
  const x0 = -W / 2 + drawerW;
  cab.add(mesh("ControlStrip", flipV(new THREE.BoxGeometry(panelW, stripH, 0.01)), [bodyDark, bodyDark, bodyDark, bodyDark, panelM, bodyDark], x0 + panelW / 2, stripY + stripH / 2, zF - 0.005 + 0.0004));
  cab.add(box("StripGroove", W, 0.0012, 0.0016, dark, 0, stripY - 0.0006, zF + 0.0008));
  cab.add(box("StripSeam", 0.0012, stripH, 0.0016, dark, x0, stripY + stripH / 2, zF + 0.0008));
}
// the dial: LG's dark-chrome knob, a chrome edge and a cone; 50.5 mm across, about 13 mm high (the height is estimated)
{
  const k = group("Dial", 0, H - 0.0399, zF + 0.0004);
  k.add(lathe("KnobBase", [[0.0268, 0], [0.0268, 0.0016], [0.0258, 0.0022], [0.0, 0.0022]], knobSkirt, 64));
  k.add(lathe("KnobSkirt", [[0.0253, 0.0016], [0.0253, 0.0112], [0.0243, 0.0126], [0.0, 0.0126]], knobSkirt, 64));
  k.add(lathe("KnobEdge", [[0.0253, 0.0098], [0.0255, 0.0114], [0.0243, 0.0128], [0.0238, 0.0124]], chrome, 64));
  k.add(mesh("KnobTop", new THREE.CircleGeometry(0.0239, 64), knobTop, 0, 0, 0.01285));
  cab.add(k);
}

// ── detergent drawer: LG's face with its finger pocket, a white tray with the three compartments behind it ──
const dX = -W / 2 + drawerW / 2, dY = H - stripH / 2;
const drawer = group("Drawer", dX, dY, zF);
{
  const hw = drawerW / 2, hh = stripH / 2;
  const s = new THREE.Shape();
  s.moveTo(-hw, -hh); s.lineTo(hw, -hh); s.lineTo(hw, hh); s.lineTo(-hw, hh); s.lineTo(-hw, -hh);
  const pw = 0.129, ph = 0.0285, pcx = 0.0125, pcy = -0.01425, r = 0.006;
  const cut = new THREE.Path();
  cut.moveTo(pcx - pw / 2 + r, pcy - ph / 2); cut.lineTo(pcx + pw / 2 - r, pcy - ph / 2); cut.quadraticCurveTo(pcx + pw / 2, pcy - ph / 2, pcx + pw / 2, pcy - ph / 2 + r);
  cut.lineTo(pcx + pw / 2, pcy + ph / 2 - r); cut.quadraticCurveTo(pcx + pw / 2, pcy + ph / 2, pcx + pw / 2 - r, pcy + ph / 2);
  cut.lineTo(pcx - pw / 2 + r, pcy + ph / 2); cut.quadraticCurveTo(pcx - pw / 2, pcy + ph / 2, pcx - pw / 2, pcy + ph / 2 - r);
  cut.lineTo(pcx - pw / 2, pcy - ph / 2 + r); cut.quadraticCurveTo(pcx - pw / 2, pcy - ph / 2, pcx - pw / 2 + r, pcy - ph / 2);
  s.holes.push(cut);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false, curveSegments: 6 });
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + hw) / drawerW, 1 - (pos.getY(i) + hh) / stripH);
  g.translate(0, 0, -0.012);
  drawer.add(mesh("DrawerFace", g, [drawerM, pocketM]));
  // the finger pocket: dark inside, a lighter lip along its lower edge and a small grip at each end
  drawer.add(mesh("PocketInside", inward(new THREE.BoxGeometry(pw - 0.002, ph - 0.002, 0.016)), pocketM, pcx, pcy, -0.02));
  drawer.add(box("PocketLip", pw - 0.012, 0.0022, 0.008, lipM, pcx, pcy - ph / 2 + 0.0026, -0.0165));
  drawer.add(box("PocketGripL", 0.006, ph - 0.008, 0.004, lipM, pcx - pw / 2 + 0.005, pcy, -0.0125));
  drawer.add(box("PocketGripR", 0.006, ph - 0.008, 0.004, lipM, pcx + pw / 2 - 0.005, pcy, -0.0125));
  // the tray behind the face (manual p.24): main wash on the left, pre-wash at the front right, softener at the back right
  const trayW = drawerW - 0.02, trayH = stripH - 0.03, trayL = 0.2, tz0 = -0.032, z1 = tz0 - trayL, zc = tz0 - trayL / 2, wt = 0.0028, y0 = -0.003;
  drawer.add(box("TrayFloor", trayW, wt, trayL, trayFloor, 0, y0 - trayH / 2 + wt / 2, zc));
  drawer.add(box("TrayWallL", wt, trayH, trayL, trayM, -trayW / 2 + wt / 2, y0, zc));
  drawer.add(box("TrayWallR", wt, trayH, trayL, trayM, trayW / 2 - wt / 2, y0, zc));
  drawer.add(box("TrayWallBack", trayW, trayH, wt, trayM, 0, y0, z1 + wt / 2));
  const xd = -trayW / 2 + trayW * 0.62;
  drawer.add(box("TrayDivider", wt, trayH * 0.92, trayL * 0.96, trayM, xd, y0 - trayH * 0.04, zc));
  const xm = (xd + trayW / 2) / 2;
  drawer.add(box("TrayCross", trayW / 2 - xd - wt, trayH * 0.85, wt, trayM, xm, y0 - trayH * 0.075, tz0 - trayL * 0.52));
  drawer.add(box("SoftenerCap", 0.03, 0.026, 0.026, trayBlue, xm, y0 - trayH / 2 + 0.015, z1 + trayL * 0.2));
  drawer.add(box("SoftenerMax", trayW / 2 - xd - 2 * wt, 0.0016, 0.004, trayBlue, xm, y0 - trayH * 0.3, tz0 - trayL * 0.52 + 0.004));
  for (let i = 0; i < 4; i++) drawer.add(box(`TrayInsert${i}`, 0.0025, trayH * 0.7, trayL * 0.3, trayM, -trayW / 2 + 0.02 + i * 0.016, y0 - trayH * 0.1, z1 + trayL * 0.2));
}
cab.add(drawer);
// the bay the drawer slides out of
{
  const bay = mesh("DrawerBay", inward(new THREE.BoxGeometry(drawerW - 0.004, stripH - 0.006, 0.27)), dark, dX, dY, zF - 0.135);
  cab.add(bay);
}

// ── gasket, stainless drum, lifters ──
const gasketRing = lathe("GasketRing", [[holeR + 0.006, 0.004], [0.178, 0.0035], [0.165, -0.012], [0.166, -0.045], [0.185, -0.085], [0.2, -0.1]], gasketM, 64);
gasketRing.position.set(cx, cy, zF - 0.004);
cab.add(gasketRing);
const drumR = 0.235, drumDepth = 0.31, drumZ = zF - 0.1 - drumDepth / 2;
{
  const g = inward(new THREE.CylinderGeometry(drumR, drumR, drumDepth, 72, 1, true));
  g.rotateX(Math.PI / 2);
  const uv = g.attributes.uv;
  const uRep = (2 * Math.PI * drumR) / 0.16, vRep = drumDepth / 0.08;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uRep, 1 - uv.getY(i) * vRep);
  cab.add(mesh("DrumShell", g, drum, cx, cy, drumZ));
}
cab.add(mesh("DrumBack", new THREE.CircleGeometry(drumR, 64), backGrey, cx, cy, drumZ - drumDepth / 2 + 0.002));
cab.add(mesh("DrumHub", new THREE.CylinderGeometry(0.03, 0.033, 0.01, 40), mat("DrumBoss", 0xe8eaec, { rough: 0.5 }), cx, cy, drumZ - drumDepth / 2 + 0.007).rotateX(Math.PI / 2));
cab.add(lathe("DrumLip", [[drumR, 0], [0.19, 0.012]], steel).translateX(cx).translateY(cy).translateZ(drumZ + drumDepth / 2));
for (let i = 0; i < 3; i++) { // three plastic lifters at 30, 150 and 270 degrees, each with an arm on the back wall as in LG's open-door photo
  const a = Math.PI / 6 + (i / 3) * Math.PI * 2;
  const lifter = box(`Lifter${i}`, 0.07, 0.03, drumDepth - 0.03, lifterM, cx + Math.cos(a) * (drumR - 0.014), cy + Math.sin(a) * (drumR - 0.014), drumZ);
  lifter.rotation.z = a + Math.PI / 2;
  cab.add(lifter);
  const arm = box(`LifterArm${i}`, 0.15, 0.03, 0.012, lifterM, cx + Math.cos(a) * 0.115, cy + Math.sin(a) * 0.115, drumZ - drumDepth / 2 + 0.011);
  arm.rotation.z = a;
  cab.add(arm);
}

// ── on the plate: hinge brackets, the door-lock slot, the transport stickers and the energy label ──
for (const hy of [0.536, 0.43]) cab.add(box("HingePlate", 0.03, 0.04, 0.005, steel, -0.215, hy, zF + 0.0025));
cab.add(box("LockSlot", 0.017, 0.025, 0.004, dark, 0.188, 0.494, zF + 0.002));
{
  const st = mesh("StickerTop", flipV(new THREE.PlaneGeometry(0.089, 0.025)), stickTop, 0.103, 0.678, zF + 0.0006);
  st.rotation.z = -Math.PI / 6; cab.add(st);
  const ss = mesh("StickerSide", flipV(new THREE.PlaneGeometry(0.021, 0.07)), stickSide, 0.171, 0.388, zF + 0.0006);
  ss.rotation.z = -0.4; cab.add(ss);
  const lw = 0.068, lh = lw * 996 / 614;
  cab.add(mesh("LabelBEE", flipV(new THREE.PlaneGeometry(lw, lh)), labelM, 0.26, 0.6695, zF + 0.0008));
}

// ── door: hinged on the left; a dark ring, a black tinted round cover, a clear dome ──
const door = group("Door", cx - ringR, cy, hingeZ);
const dc = group("DoorCentre", ringR, 0, 0);
dc.add(lathe("DoorInnerRing", [[0.16, 0.02], [ringR - 0.003, 0.02]], doorIn, 64));
dc.add(lathe("DoorRim", [[ringR, 0.02], [ringR + 0.0012, 0.028], [ringR - 0.002, 0.04], [ringR - 0.008, 0.0475]], rimM, 64));
dc.add(lathe("DoorBlack", [[ringR - 0.008, 0.0475], [0.225, 0.0535], [0.19, 0.0565], [0.152, 0.058]], ringBlack, 64));
dc.add(lathe("DoorBezel", [[0.176, 0.0572], [0.163, 0.0589], [0.152, 0.0585], [0.152, 0.0578]], mat("DoorBezelM", 0x8a8e94, { metal: 0.7, rough: 0.3 })));
dc.add(lathe("DoorGlass", [[0.152, 0.058], [0.11, 0.0591], [0.055, 0.0597], [0.0, 0.06]], glass, 64));
dc.add(lathe("DoorBowl", [[0.158, 0.02], [0.145, -0.004], [0.11, -0.028], [0.06, -0.043], [0.0, -0.048]], bowl, 64));
dc.add(box("DoorHook", 0.02, 0.026, 0.01, mat("DoorHookM", 0x1d1e20, { rough: 0.5 }), ringR - 0.012, 0, 0.0245));
door.add(dc);
root.add(door);

const parts = productParts(PRODUCTS, ID);
const clips = stateClips(root, parts);
saveZones(PRODUCTS, ID, root, parts);
await exportGLB(root, clips, OUT, {
  Front: `${T}/front.jpg`, SideL: `${T}/side_l.jpg`, SideR: `${T}/side_r.jpg`, Rear: `${T}/rear.jpg`,
  Panel: `${T}/panel.jpg`, DrawerFace: `${T}/drawer.jpg`, KnobTop: `${T}/knob_top.jpg`, Drum: `${T}/drum.jpg`,
  Hose: `${T}/hose.jpg`, LabelBEE: `${T}/label.png`, StickerTop: `${T}/sticker_top.jpg`, StickerSide: `${T}/sticker_side.jpg`,
});
