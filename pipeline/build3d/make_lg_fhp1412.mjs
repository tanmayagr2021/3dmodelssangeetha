// LG FHP1412Z9B, 12 kg front load, Platinum Black.
// Built to LG's published size, 600 W x 850 H x 565 D mm (615 mm with the door), and the
// official photos: control strip with the detergent drawer on the left, a black tinted
// glass door hinged on the left, stainless drum, filter cover bottom right.
// usage: node make_lg_fhp1412.mjs <products.json> <tex dir> <out.glb>
import { THREE, mat, mesh, box, faced, group, lathe, frontWithHoles, flipV, inward, stateClips, exportGLB, productParts } from "./lib.mjs";

const [PRODUCTS, TEX, OUT] = process.argv.slice(2);
const ID = "lg-fhp1412z9b";

// ── size (metres); photo measurements at 1 px per mm ──
const W = 0.6, H = 0.85, D = 0.565;
const zF = D / 2, zB = -D / 2;
const feet = 0.014, stripY = 0.745;                        // control strip from 0.745 to 0.85
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

const root = group("LGFHP1412");
const cab = group("Cabinet");
root.add(cab);

// ── cabinet: brushed platinum-black sides and top ──
const t = 0.012, bodyH = H - feet, midY = feet + bodyH / 2;
cab.add(faced("SideLeft", t, bodyH, D - 0.004, [dark, side, side, side, side, side], -W / 2 + t / 2, midY, -0.002));
cab.add(faced("SideRight", t, bodyH, D - 0.004, [side, dark, side, side, side, side], W / 2 - t / 2, midY, -0.002));
cab.add(faced("Top", W, t, D, [side, side, side, dark, side, side], 0, H - t / 2, 0));
cab.add(box("Base", W - 2 * t, t, D - 0.01, back, 0, feet + t / 2, -0.005));
cab.add(box("BackPanel", W - 2 * t, bodyH - t, t, back, 0, midY - t / 2, zB + t / 2));
for (const [fx, fz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
  cab.add(mesh("Foot", new THREE.CylinderGeometry(0.018, 0.02, feet, 18), footMat, fx * (W / 2 - 0.04), feet / 2, fz * (D / 2 - 0.05)));
}

// ── front: photo of LG's own front with the porthole cut out ──
const mainFront = frontWithHoles("FrontMain", W, stripY - feet, [{ x: cx, y: cy - feet, r: holeR }], front, 0.004);
mainFront.position.set(0, feet, zF - 0.004);
cab.add(mainFront);
// control strip: dial, programmes and display, right of the drawer
const stripW = W / 2 - drawerX1, stripH = H - stripY;
cab.add(mesh("ControlStrip", flipV(new THREE.BoxGeometry(stripW, stripH, 0.012)), [side, side, side, side, panel, side], drawerX1 + stripW / 2, stripY + stripH / 2, zF - 0.006));
// the drawer bay: a dark slot the drawer slides out of
const bayW = drawerX1 - drawerX0;
cab.add(mesh("DrawerBay", inward(new THREE.BoxGeometry(bayW, stripH - 0.004, 0.3)), dark, drawerX0 + bayW / 2, stripY + stripH / 2, zF - 0.15));

// ── detergent drawer: LG's photographed front and a white tray behind it ──
const drawer = group("Drawer", drawerX0 + bayW / 2, stripY + stripH / 2, zF - 0.006);
drawer.add(mesh("DrawerFace", flipV(new THREE.BoxGeometry(bayW - 0.002, stripH - 0.002, 0.012)), [side, side, side, side, drawerFront, side], 0, 0, 0));
drawer.add(mesh("DrawerTray", flipV(new THREE.BoxGeometry(bayW - 0.02, stripH - 0.03, 0.27)), [trayBody, trayBody, tray, trayBody, trayBody, trayBody], 0, -0.004, -0.141));
cab.add(drawer);

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
const door = group("Door", cx - ringR, cy, zF + 0.002);
const dc = group("DoorCentre", ringR, 0, 0);
door.add(dc);
dc.add(lathe("DoorBackRing", [[holeR - 0.01, 0], [ringR, 0]], doorBack));
dc.add(lathe("DoorRim", [[ringR, 0], [ringR + 0.002, 0.012], [ringR - 0.002, 0.03], [ringR - 0.012, 0.038]], chrome));
dc.add(lathe("DoorRing", [[ringR - 0.012, 0.038], [ringR - 0.03, 0.046], [0.214, 0.049], [0.205, 0.05]], ringBlack));
dc.add(lathe("DoorGlass", [[0.205, 0.05], [0.15, 0.054], [0.08, 0.056], [0.0, 0.057]], tint));
dc.add(lathe("DoorBowl", [[0.19, 0.0], [0.165, -0.05], [0.11, -0.085], [0.0, -0.095]], bowl));
root.add(door);

const clips = stateClips(root, productParts(PRODUCTS, ID));
await exportGLB(root, clips, OUT, {
  BodySide: `${TEX}/lg/side.jpg`,
  Front: `${TEX}/lg/front.jpg`,
  Panel: `${TEX}/lg/panel.jpg`,
  DrawerFront: `${TEX}/lg/drawer.jpg`,
  Tray: `${TEX}/lg/tray.jpg`,
  Drum: `${TEX}/lg/drum.jpg`,
});
