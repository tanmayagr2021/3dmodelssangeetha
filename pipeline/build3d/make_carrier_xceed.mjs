// Carrier 19K XCEED EDGE GXi, 1.5 ton indoor unit, White.
// 940 W x 275 H x 205 D mm. Faceted white front with the Carrier oval, a wide louvre at
// the bottom, and the front panel that lifts to reach the filters ("pull-down structure").
// The back sits at z = 0 so the unit hangs flat on a wall.
// usage: node make_carrier_xceed.mjs <products.json> <tex dir> <out.glb>
import { THREE, mat, mesh, box, faced, group, flipV, inward, stateClips, exportGLB, productParts } from "./lib.mjs";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const [PRODUCTS, TEX, OUT] = process.argv.slice(2);
const ID = "carrier-19k-xceed-edge-gxi";

const W = 0.94, H = 0.275, D = 0.205;
const panelH = 0.205, panelT = 0.012, panelY0 = H - panelH;   // front panel from 0.07 to 0.275
const outY0 = 0.018, outY1 = panelY0;                          // air outlet behind the louvre

const white = mat("Body", 0xf3f4f6, { rough: 0.32 });
const panelFront = mat("PanelFront", 0xffffff, { rough: 0.28 });
const louvreFront = mat("LouvreFront", 0xffffff, { rough: 0.3 });
const filter = mat("Filter", 0xffffff, { rough: 0.7 });
const coil = mat("Coil", 0x8d949b, { metal: 0.6, rough: 0.45 });
const outlet = mat("Outlet", 0x2c2f34, { rough: 0.7 });
const vane = mat("Vane", 0xd7dade, { rough: 0.4 });
const back = mat("Back", 0xd9dbde, { rough: 0.6 });

const root = group("CarrierXceed");
const cab = group("Chassis");
root.add(cab);

// ── chassis behind the front panel: white shell, the filters on its face ──
const chD = D - panelT - 0.002;
cab.add(mesh("Shell", new RoundedBoxGeometry(W, panelH, chD, 3, 0.014), [white, white, white, white, filter, back], 0, panelY0 + panelH / 2, chD / 2));
cab.add(box("CoilStrip", W - 0.06, 0.02, 0.004, coil, 0, panelY0 + 0.012, chD + 0.001));
// ── underside and the air outlet the louvre covers ──
cab.add(mesh("Bottom", new RoundedBoxGeometry(W, outY0 * 2, D, 3, 0.008), white, 0, outY0, D / 2));
cab.add(box("EndLeft", 0.03, outY1 - outY0, D, white, -W / 2 + 0.015, (outY0 + outY1) / 2, D / 2));
cab.add(box("EndRight", 0.03, outY1 - outY0, D, white, W / 2 - 0.015, (outY0 + outY1) / 2, D / 2));
cab.add(mesh("OutletDuct", inward(new THREE.BoxGeometry(W - 0.06, outY1 - outY0, D - 0.01)), outlet, 0, (outY0 + outY1) / 2, (D - 0.01) / 2 - 0.004));
// vertical vanes sit back in the outlet, below the gap line, so only the louvre shows from the front
for (let i = 0; i < 9; i++) {
  cab.add(box(`Vane${i}`, 0.004, outY1 - outY0 - 0.022, 0.08, vane, -0.36 + i * 0.09, outY0 + (outY1 - outY0 - 0.022) / 2 + 0.003, D - 0.085));
}

// ── front panel: hinged along its top edge, lifts up to show the filters ──
const fp = group("FrontPanel", 0, H, D);
fp.add(mesh("PanelFace", flipV(new RoundedBoxGeometry(W, panelH, panelT, 3, 0.005)), [white, white, white, white, panelFront, white], 0, -panelH / 2, -panelT / 2));
root.add(fp);

// ── louvre: the wide flap over the outlet, hinged along its top edge ──
const lv = group("Louvre", 0, outY1 - 0.002, D - 0.004);
lv.add(mesh("LouvreFace", flipV(new THREE.BoxGeometry(W - 0.07, outY1 - outY0 - 0.004, 0.008)), [white, white, white, white, louvreFront, white], 0, -(outY1 - outY0) / 2, -0.004));
root.add(lv);

const clips = stateClips(root, productParts(PRODUCTS, ID));
await exportGLB(root, clips, OUT, {
  PanelFront: `${TEX}/carrier/front.jpg`,
  LouvreFront: `${TEX}/carrier/louvre.jpg`,
  Filter: `${TEX}/carrier/filter.jpg`,
});
