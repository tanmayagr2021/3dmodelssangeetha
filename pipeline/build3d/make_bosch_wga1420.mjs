// Bosch WGA1420PIN, Series 6 front-load washing machine, 9 kg, Dark lake.
// Built to Bosch's published size, 598 W x 848 H x 590 D mm (636 mm deep with the door, 1049 mm with the door open at 90 degrees, 53 L drum),
// from Bosch's studio photo (front), its 360 degree frames (the sides with the concentric-ring Anti-Vibration panels, the open steel back with
// its hoses and plug) and its page: a control strip with the detergent drawer at the left, the dial and the display; a black glass door hinged
// on the left with a chrome ring; a round pump-filter flap at the bottom right; a stainless drum with three ribs.
// usage: node make_bosch_wga1420.mjs <products.json> <tex dir> <out.glb>
import { THREE, mat, mesh, box, faced, group, lathe, frontWithHoles, flipV, inward, stateClips, exportGLB, productParts, saveZones } from "./lib.mjs";

const [PRODUCTS, TEX, OUT] = process.argv.slice(2);
const ID = "bosch-wga1420pin";
const T = `${TEX}/bosch_wga1420`;

// ── size (metres); photo scale 2.676 px/mm across and 2.627 px/mm down, rows measured from the machine's top edge (file row 5) ──
const W = 0.598, H = 0.848, D = 0.590;
const zF = D / 2, zB = -D / 2;
const feet = 0.012, stripH = 0.1344, stripY = H - stripH;
const mmY = (row) => H - (row - 5) / 2.627 / 1000;           // photo row -> height above the floor
const mmX = (px) => (px - 800) / 2.676 / 1000;                // photo column -> metres from the centre
const cx = 0, cy = 0.455, ringR = 0.2435, holeR = 0.19;       // the door: centre and radii (measured on the studio photo)
const hingeZ = zF - 0.028;                                    // the door's hinge axis sits 28 mm behind the body front (1049 mm at 90 degrees)
const flap = { x: mmX(1315), y: mmY(1988), r: 0.0769 };      // the round pump-filter flap

// ── materials ──
const body = mat("Body", 0xffffff, { rough: 0.5 });
const front = mat("Front", 0xffffff, { rough: 0.48 });
const sideL = mat("SideL", 0xffffff, { rough: 0.5 });
const sideR = mat("SideR", 0xffffff, { rough: 0.5 });
const rearM = mat("Rear", 0xffffff, { rough: 0.55 });
const panelM = mat("Panel", 0xffffff, { rough: 0.32 });
const drawerM = mat("DrawerFace", 0xffffff, { rough: 0.3, metal: 0.15 });
const trayM = mat("Tray", 0xffffff, { rough: 0.5 });
const bodyDark = mat("BodyDark", 0x353a47, { rough: 0.5 });
const topM = mat("TopPlate", 0x2f3440, { rough: 0.75 });
const dark = mat("Dark", 0x0b0c0e, { rough: 0.8 });
const bay = mat("Bay", 0x16181e, { rough: 0.7 });
const chrome = mat("Chrome", 0xc9ccd1, { metal: 1, rough: 0.16 });
const knobCap = mat("KnobCap", 0x1e1f22, { metal: 0.2, rough: 0.28 });
const knobRing = mat("KnobRing", 0xb7bbc1, { metal: 1, rough: 0.2 });
const ringBlack = mat("DoorBlack", 0x08090b, { metal: 0.3, rough: 0.12 });
const glass = mat("DoorGlass", 0x0f1216, { rough: 0.04, opacity: 0.16, side: THREE.DoubleSide });
const bowl = mat("GlassBowl", 0x2a2f36, { rough: 0.05, opacity: 0.2, side: THREE.DoubleSide });
const doorIn = mat("DoorInner", 0x2d3036, { rough: 0.6 });
const gasket = mat("Gasket", 0x25272b, { rough: 0.85 });
const drum = mat("Drum", 0xffffff, { metal: 0.85, rough: 0.34 });
const steel = mat("Steel", 0xb9bcc0, { metal: 0.9, rough: 0.3 });
const ribM = mat("DrumRib", 0xa8acb3, { metal: 0.9, rough: 0.3 });
const backGrey = mat("DrumBack", 0x4c5056, { metal: 0.7, rough: 0.42 });
const footM = mat("Foot", 0x17181a, { rough: 0.8 });
const flapM = mat("FlapFace", 0x3a3f4c, { rough: 0.48 });
const filterM = mat("FilterCap", 0x8d9096, { rough: 0.55 });
const hoseM = mat("PumpHose", 0x101113, { rough: 0.7 });

const root = group("BoschWGA1420");
const cab = group("Cabinet");
root.add(cab);

// ── cabinet: sides carry Bosch's Anti-Vibration ring relief, the back is the open steel panel with its hoses ──
const t = 0.012, bodyH = H - feet, midY = feet + bodyH / 2;
cab.add(mesh("SideLeft", flipV(new THREE.BoxGeometry(t, bodyH, D - 0.004)), [dark, sideL, bodyDark, bodyDark, bodyDark, bodyDark], -W / 2 + t / 2, midY, -0.002));
cab.add(mesh("SideRight", flipV(new THREE.BoxGeometry(t, bodyH, D - 0.004)), [sideR, dark, bodyDark, bodyDark, bodyDark, bodyDark], W / 2 - t / 2, midY, -0.002));
cab.add(faced("Top", W, 0.014, D, [topM, topM, topM, dark, topM, topM], 0, H - 0.007, 0));
cab.add(box("Base", W - 2 * t, t, D - 0.01, dark, 0, feet + t / 2, -0.005));
cab.add(mesh("BackPanel", flipV(new THREE.BoxGeometry(W - 2 * t, bodyH - 0.014, 0.004)), [dark, dark, dark, dark, dark, rearM], 0, feet + (bodyH - 0.014) / 2, zB + 0.002));
for (const [fx, fz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
  cab.add(mesh("Foot", new THREE.CylinderGeometry(0.017, 0.019, feet, 18), footM, fx * (W / 2 - 0.045), feet / 2, fz * (D / 2 - 0.05)));
}

// ── the front below the control strip: the plain face with a hole for the door seat and one for the pump-filter flap ──
const mainFront = frontWithHoles("FrontMain", W, stripY - feet, [{ x: cx, y: cy - feet, r: holeR }, { x: flap.x, y: flap.y - feet, r: flap.r - 0.004 }], front, 0.004);
mainFront.geometry = mainFront.geometry;
mainFront.position.set(0, feet, zF - 0.004);
cab.add(mainFront);
// the control strip: the panel print, a raised face
cab.add(mesh("ControlStrip", flipV(new THREE.BoxGeometry(W, stripH, 0.01)), [bodyDark, bodyDark, bodyDark, bodyDark, panelM, bodyDark], 0, stripY + stripH / 2, zF - 0.004));
cab.add(box("StripGroove", W, 0.0012, 0.0016, dark, 0, stripY - 0.0006, zF + 0.0008));
// the knob: chrome ring, black glossy cap, a white pointer
{
  const k = group("Dial", mmX(800), mmY(176), zF + 0.001);
  k.add(lathe("KnobBase", [[0.0385, 0], [0.0385, 0.003], [0.0345, 0.0042], [0.0, 0.0042]], knobCap, 64));
  k.add(lathe("KnobRing", [[0.0362, 0.003], [0.0362, 0.0135], [0.0338, 0.0148], [0.0305, 0.0148], [0.0305, 0.0105], [0.0345, 0.0042]], knobRing, 64));
  k.add(lathe("KnobCap", [[0.0305, 0.0105], [0.0302, 0.0132], [0.0275, 0.0148], [0.0, 0.0150]], knobCap, 64));
  const mark = box("KnobMark", 0.0016, 0.0085, 0.0008, mat("KnobPointer", 0xe9ebee, { rough: 0.4 }), 0, 0.0268, 0.0114);
  k.add(mark);
  cab.add(k);
}

// ── detergent drawer: Bosch's own face with its chrome bar and logo, a tray with three compartments behind it ──
const dW = 0.1704, dH = 0.0792, dX = mmX(328), dY = mmY(179);
const drawer = group("Drawer", dX, dY, zF - 0.004);
drawer.add(mesh("DrawerFace", flipV(new THREE.BoxGeometry(dW, dH, 0.012)), [bodyDark, bodyDark, bodyDark, bodyDark, drawerM, bodyDark], 0, 0, 0.006));
drawer.add(mesh("DrawerTray", flipV(new THREE.BoxGeometry(dW - 0.016, 0.052, 0.21)), [trayM, trayM, trayM, trayM, trayM, trayM], 0, -0.008, -0.105));
cab.add(drawer);

// ── gasket and the stainless drum behind the door seat ──
const gasketRing = lathe("GasketRing", [[holeR + 0.004, 0.004], [holeR - 0.008, -0.012], [holeR - 0.022, -0.05], [holeR - 0.03, -0.085]], gasket);
gasketRing.position.set(cx, cy, zF - 0.004);
cab.add(gasketRing);
const drumR = 0.24, drumDepth = 0.30, drumZ = zF - 0.095 - drumDepth / 2;
{
  const g = inward(new THREE.CylinderGeometry(drumR, drumR, drumDepth, 72, 1, true));
  g.rotateX(Math.PI / 2);
  const uv = g.attributes.uv;
  const uRep = (2 * Math.PI * drumR) / 0.19, vRep = drumDepth / 0.095;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uRep, 1 - uv.getY(i) * vRep);
  cab.add(mesh("DrumShell", g, drum, cx, cy, drumZ));
}
cab.add(mesh("DrumBack", new THREE.CircleGeometry(drumR, 64), backGrey, cx, cy, drumZ - drumDepth / 2 + 0.002));
for (let i = 0; i < 3; i++) { // the three raised arms that run from the hub out to the ribs on the wall, a trefoil seen from the front
  const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
  const arm = box(`DrumArm${i}`, 0.17, 0.04, 0.02, ribM, cx + Math.cos(a) * 0.115, cy + Math.sin(a) * 0.115, drumZ - drumDepth / 2 + 0.012);
  arm.rotation.z = a;
  cab.add(arm);
}
cab.add(mesh("DrumHub", new THREE.CylinderGeometry(0.031, 0.034, 0.014, 40), ribM, cx, cy, drumZ - drumDepth / 2 + 0.008).rotateX(Math.PI / 2));
cab.add(lathe("DrumLip", [[drumR, 0], [holeR - 0.03, 0.012]], steel).translateX(cx).translateY(cy).translateZ(drumZ + drumDepth / 2));
for (let i = 0; i < 3; i++) { // three wide ribs, 120 degrees apart, as in Bosch's drum
  const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
  const rib = box(`DrumRib${i}`, 0.085, 0.026, drumDepth - 0.03, ribM, cx + Math.cos(a) * (drumR - 0.012), cy + Math.sin(a) * (drumR - 0.012), drumZ);
  rib.rotation.z = a + Math.PI / 2;
  cab.add(rib);
}
// ── the pump-filter recess behind the round flap: a dark housing, the round filter cap and the emergency-drain hose ──
{
  const g = group("PumpBay", flap.x, flap.y, zF);
  g.add(lathe("PumpHousing", [[flap.r - 0.004, 0.0], [flap.r - 0.004, -0.035], [0.0, -0.035]], bay, 48).rotateX(0));
  g.add(mesh("FilterCap", new THREE.CylinderGeometry(0.036, 0.036, 0.022, 36), filterM, 0.002, -0.004, -0.02).rotateX(Math.PI / 2));
  g.add(mesh("FilterGrip", new THREE.BoxGeometry(0.044, 0.01, 0.008), steel, 0.002, -0.004, -0.008));
  const hose = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.045, 0.0, -0.012), new THREE.Vector3(-0.032, 0.03, -0.012), new THREE.Vector3(0.0, 0.05, -0.012), new THREE.Vector3(0.02, 0.045, -0.014)]);
  g.add(mesh("PumpHose", new THREE.TubeGeometry(hose, 20, 0.006, 8, false), hoseM));
  cab.add(g);
}
// the flap: a round lid hinged along its lower edge, with a small tab at the top
const filter = group("FilterFlap", flap.x, flap.y - flap.r, zF + 0.0005);
filter.add(mesh("FlapDisc", new THREE.CylinderGeometry(flap.r - 0.0005, flap.r - 0.0005, 0.006, 48), [bodyDark, flapM, flapM], 0, flap.r, 0.003).rotateX(Math.PI / 2));
filter.add(mesh("FlapRim", new THREE.TorusGeometry(flap.r - 0.0005, 0.0012, 6, 48), dark, 0, flap.r, 0.0062));
filter.add(box("FlapTab", 0.017, 0.006, 0.004, dark, 0, 2 * flap.r - 0.006, 0.006));
root.add(filter);

// ── door: hinged on the left; chrome ring, black glass, a clear dome ──
// the door stands 46 mm proud of the body front (636 mm deep with the door); its front is at 0.074 above the hinge axis
const door = group("Door", cx - ringR, cy, hingeZ);
const dc = group("DoorCentre", ringR, 0, 0);
dc.add(lathe("DoorInnerRing", [[holeR - 0.02, 0.028], [ringR - 0.003, 0.028]], doorIn));
dc.add(lathe("DoorRim", [[ringR, 0.028], [ringR + 0.0012, 0.0395], [ringR - 0.002, 0.0545], [ringR - 0.0075, 0.0603]], chrome));
dc.add(lathe("DoorBlack", [[ringR - 0.0075, 0.0603], [ringR - 0.016, 0.0645], [0.19, 0.0676], [0.162, 0.0704]], ringBlack));
dc.add(lathe("DoorGlass", [[0.162, 0.0704], [0.12, 0.0720], [0.06, 0.0732], [0.0, 0.0738]], glass));
dc.add(lathe("DoorBowl", [[0.165, 0.028], [0.15, -0.002], [0.115, -0.035], [0.06, -0.054], [0.0, -0.062]], bowl));
door.add(dc);
root.add(door);

const parts = productParts(PRODUCTS, ID);
const clips = stateClips(root, parts);
saveZones(PRODUCTS, ID, root, parts);
await exportGLB(root, clips, OUT, {
  Body: `${T}/body.jpg`, Front: `${T}/front.jpg`, SideL: `${T}/side_l.jpg`, SideR: `${T}/side_r.jpg`, Rear: `${T}/rear.jpg`,
  Panel: `${T}/panel.jpg`, DrawerFace: `${T}/drawer.jpg`, Tray: `${T}/tray.jpg`, Drum: `${T}/drum.jpg`,
});
