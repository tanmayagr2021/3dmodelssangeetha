// Haier HSO52KU-CAI3NB-I (Haier's own code HSA52KU-CAI3NB-I), 1.5 ton 3 star Kinouchi Ultra AI Smart inverter split AC, indoor unit.
// Size from Haier India's Kinouchi Ultra page: 916 W x 306 H x 223 D mm. Shape from Haier's own photos: a curved white front
// panel with the Haier logo, the 26 display with a snowflake and the DC inverter badge; a gold strip under the panel that runs
// into a gold ring on each end cap; the wide louvre below; inlet slots on top.
// Haier's manual: the inlet grille (front panel) lifts to reach the air purifying filter; the horizontal flap (louvre) sits over
// the outlet with its vertical blades. The back sits at z = 0 so the unit hangs flat on a wall.
// usage: node make_haier_hso52.mjs <entries json> <tex dir> <out.glb>
import { THREE, mat, mesh, box, group, stateClips, exportGLB, productParts, saveZones } from "./lib.mjs";

const [PRODUCTS, TEX, OUT] = process.argv.slice(2);
const ID = "haier-hso52kucai3nb";

// ── size (metres) ──
const W = 0.916, H = 0.306, D = 0.223;
const capT = 0.009, xIn = 0.4465;                // end caps from |x| 0.4465 to 0.4555, gold ring outside
const xL = 0.39;                                 // louvre spans |x| < 0.386 (photo: 135 to 1070 px)
const zGrille = 0.10;                            // top inlet slots from the wall to here; the panel from here
const yGold0 = 0.0647, yGold1 = 0.0756;            // gold strip under the panel (photo rows 701 to 714)

// ── side profile, (z, y) pairs; front at +z ──
const zr = 0.163, yr = 0.25, rz = 0.056, ry = H - yr;          // top front round-over
const frontZ = (y) => 0.2185 + 0.0045 * Math.sin(Math.PI * (y - yGold1) / (yr - yGold1)); // panel bulge, 210 mm deep
const lc = [0.1535, 0.0627], la = 0.065, lb = 0.049;              // louvre arc: centre and radii
const arc = (cz, cy, az, ay, t0, t1, n) => [...Array(n + 1).keys()].map((i) => {
  const t = THREE.MathUtils.degToRad(t0 + (t1 - t0) * (i / n));
  return [cz + az * Math.cos(t), cy + ay * Math.sin(t)];
});
const lin = (a, b, n) => [...Array(n + 1).keys()].map((i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
const frontPts = (y0, y1, n, inset = 0) => [...Array(n + 1).keys()].map((i) => { const y = y0 + (y1 - y0) * i / n; return [frontZ(y) - inset, y]; });

// panel outer surface: top (from the slots) -> round-over -> front, down to the gold strip
const panelOuter = [...lin([zGrille, H], [zr, H], 4).slice(0, -1), ...arc(zr, yr, rz, ry, 90, 0, 16).slice(0, -1), ...frontPts(yr, yGold1, 16)];
const louvreOuter = arc(lc[0], lc[1], la, -lb, 1.5, 90, 20);   // from just under the lip to the rear edge
// the older outlet/underside numbers were drawn for a 0.083 louvre centre; these maps move them to this unit's louvre
const DZ = 0.0135, KU = 0.0137 / 0.029;
const mapU = ([z, y]) => [z + DZ * Math.min(1, z / 0.14), y * KU];
const mapS = ([z, y]) => [z + DZ * Math.min(1, z / 0.14), 0.0137 + (y - 0.029) * (lc[1] - 0.0137) / (0.083 - 0.029)];
const underside = [[0.14, 0.029], [0.115, 0.022], [0.085, 0.013], [0.055, 0.005], [0.03, 0.001], [0.012, 0], [0.004, 0.002], [0, 0.008]].map(mapU);
// the whole outline, clockwise seen from +x with z to the right: for the end caps
const outline = [[0, H - 0.006], [0.006, H], ...lin([0.006, H], [zr, H], 6).slice(1, -1), ...arc(zr, yr, rz, ry, 90, 0, 16).slice(0, -1),
  ...frontPts(yr, yGold0, 18), ...arc(lc[0], lc[1], la, -lb, 0, 90, 20).slice(1), ...underside.slice(1)];

// ── materials ──
const panelFront = mat("PanelFront", 0xffffff, { rough: 0.22 });
const panelInner = mat("PanelInner", 0xe3e5e8, { rough: 0.6 });
const body = mat("Body", 0xf2f3f5, { rough: 0.3 });
const gold = mat("Gold", 0xf2d27a, { metal: 0.55, rough: 0.35, emissive: 0x3a2c08 });
const capMat = mat("SideCap", 0xe2e4e7, { rough: 0.38 });
const sideFace = mat("SideFace", 0xf6f6f7, { rough: 0.22 });
const grille = mat("TopGrille", 0xffffff, { rough: 0.5 });
const filterMat = mat("Filter", 0xffffff, { rough: 0.75 });
const louvreMat = mat("Louvre", 0xf0f1f3, { rough: 0.28 });
const louvreIn = mat("LouvreInner", 0xd4d7db, { rough: 0.5 });
const outlet = mat("Outlet", 0x26292e, { rough: 0.85 });
const vaneMat = mat("Vane", 0xd2d5d9, { rough: 0.45 });
const bottomMat = mat("Bottom", 0xe6e8eb, { rough: 0.5 });
const backMat = mat("Back", 0xc6c9cd, { rough: 0.7 });
const boardMat = mat("DisplayBoard", 0xdfe2e5, { rough: 0.5 });
const windowMat = mat("DisplayWindow", 0x15171a, { rough: 0.2 });

// ── geometry helpers ──
// A surface swept along x from a (z, y) polyline. Normals point to the left of the direction of
// travel (outward for a clockwise outline); `flip` turns them round. UVs: "planar" projects
// from the front (u by x, v by y, v = 0 at the top), "arc" runs v along the polyline.
function ribbon(name, pts, x0, x1, material, { flip = false, uv = "arc", box: ub = null } = {}) {
  const s = flip ? -1 : 1;
  const n = pts.length;
  const len = [0];
  for (let i = 1; i < n; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const pos = [], nor = [], uvs = [], idx = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tz = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tz, ty) || 1; tz /= l; ty /= l;
    const nz = -ty * s, ny = tz * s;
    for (const x of [x0, x1]) {
      pos.push(x, pts[i][1], pts[i][0]);
      nor.push(0, ny, nz);
      if (uv === "planar") uvs.push((x - ub.x0) / (ub.x1 - ub.x0), (ub.y1 - pts[i][1]) / (ub.y1 - ub.y0));
      else if (uv === "topz") uvs.push((x - ub.x0) / (ub.x1 - ub.x0), (pts[i][0] - ub.z0) / (ub.z1 - ub.z0));
      else uvs.push((x - x0) / (x1 - x0), len[i] / len[n - 1]);
    }
  }
  const P = (i) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  for (let i = 0; i < n - 1; i++) {
    const a = 2 * i, b = 2 * i + 1, c = 2 * i + 2, d = 2 * i + 3;
    // wind each quad so its face normal agrees with the vertex normals
    const fn = new THREE.Vector3().crossVectors(P(c).sub(P(a)), P(b).sub(P(a)));
    const vn = new THREE.Vector3(nor[a * 3], nor[a * 3 + 1], nor[a * 3 + 2]).add(new THREE.Vector3(nor[c * 3], nor[c * 3 + 1], nor[c * 3 + 2]));
    if (fn.dot(vn) >= 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return mesh(name, g, material);
}
// offset a polyline along its normals (inward for a clockwise outline when d > 0)
function offset(pts, d) {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tz = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tz, ty) || 1;
    return [p[0] + (ty / l) * d, p[1] - (tz / l) * d];
  });
}
// a flat face in the plane x = const, from a (z, y) polygon, facing +x (side = 1) or -x (side = -1)
function sideShape(name, poly, x, side, material, depth = 0) {
  const shape = new THREE.Shape(poly.map(([z, y]) => new THREE.Vector2(side > 0 ? -z : z, y)));
  const g = depth ? new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 }) : new THREE.ShapeGeometry(shape);
  g.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2);
  // ExtrudeGeometry runs from 0 to depth along the face normal
  g.translate(depth ? x - side * depth : x, 0, 0);
  return mesh(name, g, material);
}
// a thin shell swept along x: outer surface, inner surface, the two long edges and both ends
function shell(name, outer, t, x0, x1, outerMat, innerMat, edgeMat, uvOpts = {}) {
  const g = group(name);
  const inner = offset(outer, t);
  g.add(ribbon(name + "Outer", outer, x0, x1, outerMat, uvOpts));
  g.add(ribbon(name + "Inner", inner, x0, x1, innerMat, { flip: true }));
  g.add(ribbon(name + "Edge0", [inner[0], outer[0]], x0, x1, edgeMat));
  g.add(ribbon(name + "Edge1", [outer.at(-1), inner.at(-1)], x0, x1, edgeMat));
  const poly = [...outer, ...inner.slice().reverse()];
  g.add(sideShape(name + "EndL", poly, x0, -1, edgeMat));
  g.add(sideShape(name + "EndR", poly, x1, 1, edgeMat));
  return g;
}

const root = group("HaierKinouchiUltra");
const cab = group("Chassis");
root.add(cab);

// ── chassis: top inlet slots, back, underside ──
cab.add(ribbon("TopBackEdge", [[0, H - 0.006], [0.006, H]], -xIn, xIn, body));
cab.add(ribbon("TopGrille", lin([0.006, H], [zGrille, H], 1), -xIn, xIn, grille, { uv: "topz", box: { x0: -xIn, x1: xIn, z0: 0, z1: zGrille } }));
cab.add(ribbon("Back", [[0, 0.008], [0, H - 0.006]], -xIn, xIn, backMat));
cab.add(ribbon("Underside", underside, -xIn, xIn, bottomMat));

// ── under the panel: the two air filters over the coil, the display board, the outlet lip ──
const filterFace = offset(panelOuter, 0.008).map(([z, y]) => [Math.max(z, zGrille), y]);
filterFace[filterFace.length - 1][1] = 0.088;
cab.add(ribbon("FilterStep", [[zGrille, H], [zGrille, filterFace[0][1]]], -xIn, xIn, body));
cab.add(ribbon("Filters", filterFace, -xIn, xIn, filterMat));
const ff = filterFace.at(-1);
cab.add(ribbon("OutletLip", [ff, [lc[0] + la - 0.0025, yGold0 + 0.001], [lc[0] + la - 0.0025, lc[1]]], -xIn, xIn, body));
const board = group("DisplayBoard", 0.312, 0.1812, frontZ(0.1812) - 0.0105);
board.add(box("DisplayCase", 0.086, 0.032, 0.006, boardMat, 0, 0, 0));
board.add(box("DisplayGlass", 0.05, 0.016, 0.001, windowMat, -0.004, 0, 0.0035));
cab.add(board);

// ── outlet behind the louvre: dark scroll, its side walls and the vertical blades ──
const scroll = [[0.2025, 0.0832], [0.185, 0.081], [0.165, 0.078], [0.145, 0.071], [0.128, 0.06], [0.119, 0.047], [0.121, 0.036], [0.13, 0.03], [0.14, 0.029]].map(mapS);
cab.add(ribbon("OutletScroll", scroll, -xL, xL, outlet));
const mouth = [...arc(lc[0], lc[1], la, -lb, 0, 90, 16), ...scroll.slice(1, -1).reverse()];
cab.add(sideShape("OutletWallL", mouth, -xL, 1, outlet));
cab.add(sideShape("OutletWallR", mouth, xL, -1, outlet));
const vane = [[0.196, 0.0785], [0.168, 0.0755], [0.14, 0.066], [0.127, 0.052], [0.13, 0.04], [0.142, 0.0365]].map(mapS).concat(
  arc(lc[0], lc[1], la - 0.009, -(lb - 0.009), 80, 6, 6));
for (let i = 0; i < 9; i++) cab.add(sideShape(`Vane${i}`, vane, -0.33 + i * 0.0825 + 0.001, 1, vaneMat, 0.002));
// the fixed corners either side of the louvre, on the louvre's curve
const corner = arc(lc[0], lc[1], la, -lb, 0, 90, 20);
cab.add(ribbon("CornerL", corner, -xIn, -xL - 0.0015, body));
cab.add(ribbon("CornerR", corner, xL + 0.0015, xIn, body));

// ── end caps with the gold ring, as on Haier's photos ──
const ringPath = new THREE.CatmullRomCurve3([[0.08, 0.3035], [0.15, 0.3035], [0.186, 0.293], [0.2005, 0.255], [0.2035, 0.175], [0.2, 0.095],
  [0.1965, 0.07], [0.183, 0.0475], [0.16, 0.0365], [0.13, 0.0315], [0.097, 0.037], [0.077, 0.066], [0.072, 0.17], [0.073, 0.27]]
  .map(([z, y]) => new THREE.Vector3(0, 0.02 + (y - 0.0315) * (0.299 - 0.02) / (0.3035 - 0.0315), z * 1.088)), true, "centripetal");
const ringPts = ringPath.getSpacedPoints(120).map((v) => [v.z, v.y]);
for (const side of [-1, 1]) {
  const s = side < 0 ? "L" : "R";
  cab.add(sideShape("Cap" + s, outline, side * (xIn + capT), side, capMat, capT));
  cab.add(sideShape("CapFace" + s, ringPts.slice(0, -1), side * (xIn + capT + 0.0003), side, sideFace));
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ringPath.getSpacedPoints(160).map((v) => new THREE.Vector3(side * (xIn + capT + 0.0004), v.y, v.z)), true), 160, 0.0019, 6, true);
  cab.add(mesh("GoldRing" + s, tube, gold));
}

// ── front panel: hinged at its back edge on top, lifts up to reach the filters ──
const pv = [zGrille, H - 0.003];
const fp = group("FrontPanel", 0, pv[1], pv[0]);
const rel = (pts) => pts.map(([z, y]) => [z - pv[0], y - pv[1]]);
const panel = shell("Panel", rel(panelOuter), 0.004, -xIn, xIn, panelFront, panelInner, body,
  { uv: "planar", box: { x0: -xIn, x1: xIn, y0: yGold1 - pv[1], y1: H - pv[1] } });
fp.add(panel);
// the gold strip along the panel's lower edge, running into the rings
const strip = box("GoldStrip", 2 * (xIn + 0.0075), yGold1 - yGold0, 0.004, gold, 0, (yGold0 + yGold1) / 2 - pv[1], frontZ(yGold1) - 0.0015 - pv[0]);
fp.add(strip);
root.add(fp);

// ── louvre: the curved flap over the outlet, pivoting at its back edge ──
const lp = [lc[0], lc[1] - lb + 0.002];
const lv = group("Louvre", 0, lp[1], lp[0]);
lv.add(shell("Flap", louvreOuter.map(([z, y]) => [z - lp[0], y - lp[1]]), 0.004, -xL, xL, louvreMat, louvreIn, louvreMat));
root.add(lv);

const parts = productParts(PRODUCTS, ID);
const clips = stateClips(root, parts);
saveZones(PRODUCTS, ID, root, parts);
await exportGLB(root, clips, OUT, {
  PanelFront: `${TEX}/haier_hso52/panel.jpg`,
  Filter: `${TEX}/haier_hso52/filter.jpg`,
  TopGrille: `${TEX}/haier_hso52/top.jpg`,
}, { dir: `${TEX}/grain`, materials: {
  // Grain (BENCHMARK.md section 10): glossy moulded white plastic, a faint ripple in the reflections.
  // Not on the front panel: it carries the printed logo, display and badge, and the ripple mottled the
  // dark print in close-ups. A gloss front panel is smooth; the studio light's reflections show its finish.
  SideFace: { type: "peel_soft" }, Body: { type: "peel_soft" },
  SideCap: { type: "peel_soft" }, Louvre: { type: "peel_soft" },
} });
