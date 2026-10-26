// Finds z-fighting in a GLB: two surfaces in the same plane, facing the same way, overlapping.
// The GPU can't decide which one is in front, so the overlap flickers or shows stripes.
// usage: node zfight.mjs <model.glb> [tolerance in mm, default 0.5] [min overlap in mm2, default 4]
import fs from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const [file, tolArg, minArg] = process.argv.slice(2);
const TOL = (+tolArg || 0.5) / 1000;
const MIN_AREA = (+minArg || 4) / 1e6;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(file);

// world-space triangles, with the mesh node they came from
const tris = [];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const apply = (m, v) => [
  m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
  m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
  m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
];
for (const node of doc.getRoot().listNodes()) {
  const m = node.getMesh();
  if (!m) continue;
  const w = node.getWorldMatrix();
  for (const prim of m.listPrimitives()) {
    const mat = prim.getMaterial();
    if (mat && mat.getAlphaMode() === "BLEND" && mat.getBaseColorFactor()[3] < 0.95) continue; // glass blends, it doesn't fight
    const pos = prim.getAttribute("POSITION");
    const idx = prim.getIndices();
    const n = idx ? idx.getCount() : pos.getCount();
    for (let i = 0; i < n; i += 3) {
      const ids = [0, 1, 2].map((k) => (idx ? idx.getScalar(i + k) : i + k));
      const p = ids.map((j) => apply(w, pos.getElement(j, [0, 0, 0])));
      const nn = cross(sub(p[1], p[0]), sub(p[2], p[0]));
      const len = Math.hypot(...nn);
      if (len < 1e-12) continue;
      const nrm = nn.map((x) => x / len);
      tris.push({ p, nrm, d: dot(nrm, p[0]), area: len / 2, name: node.getName(), mat: mat?.getName() ?? "", ds: mat?.getDoubleSided() });
    }
  }
}

// bucket by normal, then compare triangles whose plane offsets are within TOL
const buckets = new Map();
for (const t of tris) {
  const k = t.nrm.map((x) => Math.round(x * 60)).join(",");
  (buckets.get(k) ?? buckets.set(k, []).get(k)).push(t);
}
const basis = (n) => {
  const a = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = cross(n, a), ul = Math.hypot(...u);
  const uu = u.map((x) => x / ul);
  return [uu, cross(n, uu)];
};
const area2 = (poly) => { let s = 0; for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; s += x1 * y2 - x2 * y1; } return s / 2; };
function clip(subject, clipPoly) { // Sutherland-Hodgman, clipPoly counter-clockwise
  let out = subject;
  for (let i = 0; i < clipPoly.length && out.length; i++) {
    const a = clipPoly[i], b = clipPoly[(i + 1) % clipPoly.length];
    const inside = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= -1e-12;
    const isect = (p, q) => {
      const A1 = q[1] - p[1], B1 = p[0] - q[0], C1 = A1 * p[0] + B1 * p[1];
      const A2 = b[1] - a[1], B2 = a[0] - b[0], C2 = A2 * a[0] + B2 * a[1];
      const det = A1 * B2 - A2 * B1;
      return det === 0 ? p : [(B2 * C1 - B1 * C2) / det, (A1 * C2 - A2 * C1) / det];
    };
    const inp = out; out = [];
    for (let j = 0; j < inp.length; j++) {
      const cur = inp[j], prev = inp[(j + inp.length - 1) % inp.length];
      if (inside(cur)) { if (!inside(prev)) out.push(isect(prev, cur)); out.push(cur); }
      else if (inside(prev)) out.push(isect(prev, cur));
    }
  }
  return out;
}

const pairs = new Map();
for (const list of buckets.values()) {
  list.sort((a, b) => a.d - b.d);
  for (let i = 0; i < list.length; i++) {
    const A = list[i];
    for (let j = i + 1; j < list.length && list[j].d - A.d <= TOL; j++) {
      const B = list[j];
      if (A.name === B.name) continue;
      if (dot(A.nrm, B.nrm) < 0.9995) continue;
      const [u, v] = basis(A.nrm);
      const to2 = (p) => [dot(p, u), dot(p, v)];
      let pa = A.p.map(to2), pb = B.p.map(to2);
      if (area2(pa) < 0) pa.reverse();
      if (area2(pb) < 0) pb.reverse();
      const ov = Math.abs(area2(clip(pa, pb)));
      if (ov < MIN_AREA) continue;
      const key = [A.name, B.name].sort().join("  <->  ");
      const e = pairs.get(key) ?? pairs.set(key, { area: 0, gap: 0, n: 0 }).get(key);
      e.area += ov; e.n++; e.gap = Math.max(e.gap, Math.abs(B.d - A.d));
    }
  }
}
const rows = [...pairs.entries()].sort((a, b) => b[1].area - a[1].area);
console.log(`${file.split("/").pop()}: ${tris.length} triangles, ${rows.length} z-fighting pairs`);
for (const [k, e] of rows) console.log(`  ${(e.area * 1e4).toFixed(2).padStart(8)} cm2  gap ${(e.gap * 1000).toFixed(2)} mm  ${k}`);
process.exitCode = rows.length ? 1 : 0;
