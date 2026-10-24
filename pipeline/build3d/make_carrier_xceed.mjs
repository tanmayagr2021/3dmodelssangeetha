// Carrier 19K XCEED EDGE GXi, 1.5 ton indoor unit, White.
// 985 W x 306 H x 217 D mm: the 1.5 ton row of Carrier's XCEED EDGE GXi variant table (SKU CAI19XD3R36W0).
// Faceted white front with the Carrier oval, a wide louvre at the bottom, and the front panel that
// lifts to reach the filters ("pull-down structure"). The split between panel and louvre follows
// Carrier's front photo (panel 68% of the height, louvre 21%, a 10% chin).
// The back sits at z = 0 so the unit hangs flat on a wall.
// usage: node make_carrier_xceed.mjs <products.json> <tex dir> <out.glb>
import { THREE, mat, mesh, box, faced, group, flipV, inward, stateClips, exportGLB, productParts, saveZones } from "./lib.mjs";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const [PRODUCTS, TEX, OUT] = process.argv.slice(2);
const ID = "carrier-19k-xceed-edge-gxi";

const W = 0.985, H = 0.306, D = 0.217;
const panelH = 0.208, panelT = 0.012, panelY0 = H - panelH;   // front panel from 0.098 to 0.306
const outY0 = 0.030, outY1 = panelY0;                          // air outlet behind the louvre

const white = mat("Body", 0xf3f4f6, { rough: 0.32 });
const panelFront = mat("PanelFront", 0xffffff, { rough: 0.28 });
const louvreFront = mat("LouvreFront", 0xffffff, { rough: 0.3 });
const filter = mat("Filter", 0xffffff, { rough: 0.7 });
const coil = mat("Coil", 0x8d949b, { metal: 0.6, rough: 0.45 });
const outlet = mat("Outlet", 0x2c2f34, { rough: 0.7 });
const vane = mat("Vane", 0xd7dade, { rough: 0.4 });
const back = mat("Back", 0xd9dbde, { rough: 0.6 });

// Front outline with rounded corners (Carrier's photo shows about 16 mm at the top corners).
function rrect(w, h, rt, rb) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + rb, 0); s.lineTo(w / 2 - rb, 0); s.quadraticCurveTo(w / 2, 0, w / 2, rb);
  s.lineTo(w / 2, h - rt); s.quadraticCurveTo(w / 2, h, w / 2 - rt, h); s.lineTo(-w / 2 + rt, h);
  s.quadraticCurveTo(-w / 2, h, -w / 2, h - rt); s.lineTo(-w / 2, rb); s.quadraticCurveTo(-w / 2, 0, -w / 2 + rb, 0);
  return s;
}
// a one-sided picture plane in that outline, textured by position (v counted from the top, as glTF wants)
function picture(name, shape, w, h, material, z) {
  const g = new THREE.ShapeGeometry(shape, 10);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, 1 - pos.getY(i) / h);
  return mesh(name, g, material, 0, 0, z);
}
const RT = 0.016, RB = 0.004, BEV = 0.003;

const root = group("CarrierXceed");
const cab = group("Chassis");
root.add(cab);

// ── chassis behind the front panel: white shell, the filters on its face ──
const chD = D - panelT - 0.002;
{ // chassis shell: same rounded outline as the panel, filters on its face
  const sh = rrect(W, panelH, RT, RB);
  // the bevel grows the solid by BEV on every side, so the extruded outline is that much smaller
  const body = mesh("Shell", new THREE.ExtrudeGeometry(rrect(W - 2 * BEV, panelH - 2 * BEV, RT - BEV, RB - BEV), { depth: chD - 2 * BEV, bevelEnabled: true, bevelSize: BEV, bevelThickness: BEV, bevelSegments: 2, curveSegments: 10 }), white, 0, panelY0 + BEV, BEV);
  cab.add(body);
  cab.add(picture("ShellFilters", sh, W, panelH, filter, chD + 0.0004).translateY(panelY0));
}
cab.add(box("CoilStrip", W - 0.06, 0.02, 0.004, coil, 0, panelY0 + 0.012, chD + 0.001));
// ── underside and the air outlet the louvre covers ──
cab.add(mesh("Bottom", new RoundedBoxGeometry(W, outY0 * 2, D, 3, 0.008), white, 0, outY0, D / 2));
cab.add(box("EndLeft", 0.03, outY1 - outY0, D, white, -W / 2 + 0.015, (outY0 + outY1) / 2, D / 2));
cab.add(box("EndRight", 0.03, outY1 - outY0, D, white, W / 2 - 0.015, (outY0 + outY1) / 2, D / 2));
cab.add(mesh("OutletDuct", inward(new THREE.BoxGeometry(W - 0.06, outY1 - outY0, D - 0.01)), outlet, 0, (outY0 + outY1) / 2, (D - 0.01) / 2));
// vertical vanes sit back in the outlet, below the gap line, so only the louvre shows from the front
// Carrier's open-louvre photo shows the outlet in three groups of four cells: eleven vanes, the two between groups heavier
const outW = W - 0.09;
for (let i = 1; i <= 11; i++) {
  const sep = i === 4 || i === 8;
  cab.add(box(`Vane${i}`, sep ? 0.008 : 0.004, outY1 - outY0 - 0.022, 0.08, vane, -outW / 2 + (i * outW) / 12, outY0 + (outY1 - outY0 - 0.022) / 2 + 0.003, D - 0.085));
}

// ── front panel: hinged along its top edge, lifts up to show the filters ──
const fp = group("FrontPanel", 0, H, D);
{
  const sh = rrect(W, panelH, RT, RB);
  fp.add(mesh("PanelBody", new THREE.ExtrudeGeometry(rrect(W - 2 * BEV, panelH - 2 * BEV, RT - BEV, RB - BEV), { depth: panelT - 2 * BEV, bevelEnabled: true, bevelSize: BEV, bevelThickness: BEV, bevelSegments: 2, curveSegments: 10 }), white, 0, BEV - panelH, BEV - panelT));
  fp.add(picture("PanelFace", sh, W, panelH, panelFront, 0.0004).translateY(-panelH));
}
root.add(fp);

// ── louvre: the wide flap over the outlet, hinged along its top edge ──
const lv = group("Louvre", 0, outY1 - 0.002, D - 0.004);
{ // a thin flap bowed outward by 6 mm, like the one in Carrier's photos: white body plus the textured outer skin
  const fw = W - 0.07, fh = outY1 - outY0 - 0.004, thick = 0.004, bulge = 0.006, N = 12;
  const zf = (t) => -0.002 + bulge * Math.sin(Math.PI * t) - 0.002;        // outer surface z at t = 0 (top) .. 1 (bottom)
  const prof = new THREE.Shape();                                              // shape x = -z, y = height
  for (let i = 0; i <= N; i++) { const t = i / N; i === 0 ? prof.moveTo(-zf(t), -t * fh) : prof.lineTo(-zf(t), -t * fh); }
  for (let i = N; i >= 0; i--) { const t = i / N; prof.lineTo(-(zf(t) - thick), -t * fh); }
  const bg = new THREE.ExtrudeGeometry(prof, { depth: fw, bevelEnabled: false });
  bg.rotateY(Math.PI / 2); bg.translate(-fw / 2, 0, 0);
  lv.add(mesh("LouvreBody", bg, white));
  const sk = new THREE.PlaneGeometry(fw, fh, 1, N);
  const pos = sk.attributes.position, uv = sk.attributes.uv;
  for (let i = 0; i < pos.count; i++) { const t = (fh / 2 - pos.getY(i)) / fh; pos.setZ(i, zf(t) + 0.0004); pos.setY(i, -t * fh); uv.setY(i, 1 - uv.getY(i)); }
  sk.computeVertexNormals();
  lv.add(mesh("LouvreFace", sk, louvreFront));
}
root.add(lv);

const parts = productParts(PRODUCTS, ID);
const clips = stateClips(root, parts);
saveZones(PRODUCTS, ID, root, parts);
await exportGLB(root, clips, OUT, {
  PanelFront: `${TEX}/carrier/front.jpg`,
  LouvreFront: `${TEX}/carrier/louvre.jpg`,
  Filter: `${TEX}/carrier/filter.jpg`,
});
