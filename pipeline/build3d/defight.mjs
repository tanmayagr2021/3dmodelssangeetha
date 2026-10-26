// Removes z-fighting from a GLB. Two surfaces in the same plane, facing the same way, flicker
// or show stripes because the GPU can't tell which is in front. Every such pair is separated
// by GAP: the smaller part's surface is moved out along its normal (the bigger part stays put),
// and the vertices are moved together with their neighbours so no crack opens at the edges.
// usage: node defight.mjs <in.glb> [out.glb]        (out defaults to in)
// also exported: defight(doc) for the builders' export step, and findFights(doc) for checks.
import fs from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

export const GAP = 0.0008;       // metres: the separation every fighting pair ends up with
const TOL = 0.0012;              // pairs closer than this (and overlapping) are looked at
const MIN_AREA = 2e-6;           // m2: smaller overlaps are invisible

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const apply = (m, v) => [
  m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
  m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
  m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
];
const inv3 = (m) => { // inverse of the upper 3x3 of a column-major 4x4, as a function on vectors
  const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f = m[9], g = m[2], h = m[6], i = m[10];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  const r = [(e * i - f * h), -(b * i - c * h), (b * f - c * e), -(d * i - f * g), (a * i - c * g), -(a * f - c * d), (d * h - e * g), -(a * h - b * g), (a * e - b * d)].map((x) => x / det);
  return (v) => [r[0] * v[0] + r[1] * v[1] + r[2] * v[2], r[3] * v[0] + r[4] * v[1] + r[5] * v[2], r[6] * v[0] + r[7] * v[1] + r[8] * v[2]];
};

const ranks = new Map();
function collect(doc) {
  const tris = [], parts = new Map();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const w = node.getWorldMatrix();
    let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    const mine = [];
    mesh.listPrimitives().forEach((prim, pi) => {
      const mat = prim.getMaterial();
      const glass = mat && mat.getAlphaMode() === "BLEND" && mat.getBaseColorFactor()[3] < 0.95;
      const pos = prim.getAttribute("POSITION");
      const idx = prim.getIndices();
      const n = idx ? idx.getCount() : pos.getCount();
      for (let i = 0; i < n; i += 3) {
        const ids = [0, 1, 2].map((k) => (idx ? idx.getScalar(i + k) : i + k));
        const p = ids.map((j) => apply(w, pos.getElement(j, [0, 0, 0])));
        for (const q of p) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], q[k]); hi[k] = Math.max(hi[k], q[k]); }
        if (glass) continue;
        const nn = cross(sub(p[1], p[0]), sub(p[2], p[0]));
        const len = Math.hypot(...nn);
        if (len < 1e-12) continue;
        const nrm = nn.map((x) => x / len);
        mine.push({ p, nrm, d: dot(nrm, p[0]), node, pi, ids, area: len / 2, name: node.getName(), ds: mat?.getDoubleSided() });
      }
    });
    const vol = (hi[0] - lo[0]) * (hi[1] - lo[1]) * (hi[2] - lo[2]);
    parts.set(node, { vol: isFinite(vol) ? vol : 0, name: node.getName() });
    tris.push(...mine);
  }
  // priority: a bigger part stays put, a smaller one moves out of its way; ties by name, then order
  // (fixed on the first look: moving parts out must not change who stays and who moves)
  const first = !ranks.size;
  if (first) [...parts.entries()].sort((a, b) => b[1].vol - a[1].vol || a[1].name.localeCompare(b[1].name)).forEach(([node], i) => ranks.set(node, i));
  for (const [node, e] of parts) e.rank = ranks.get(node) ?? 1e9;
  return { tris, parts };
}

const basis = (n) => {
  const a = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = cross(n, a), ul = Math.hypot(...u);
  const uu = u.map((x) => x / ul);
  return [uu, cross(n, uu)];
};
const area2 = (poly) => { let s = 0; for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; s += x1 * y2 - x2 * y1; } return s / 2; };
function clip(subject, clipPoly) {
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

// every pair of overlapping coplanar triangles of two different parts: [lower-priority tri, higher-priority tri, overlap]
export function findFights(doc, collected = collect(doc)) {
  const { tris, parts } = collected;
  const buckets = new Map();
  for (const t of tris) {
    const k = t.nrm.map((x) => Math.round(x * 60)).join(",");
    (buckets.get(k) ?? buckets.set(k, []).get(k)).push(t);
  }
  const found = [];
  for (const list of buckets.values()) {
    list.sort((a, b) => a.d - b.d);
    for (let i = 0; i < list.length; i++) {
      const A = list[i];
      for (let j = i + 1; j < list.length && list[j].d - A.d <= TOL; j++) {
        const B = list[j];
        if (A.node === B.node || dot(A.nrm, B.nrm) < 0.9995) continue;
        const [u, v] = basis(A.nrm);
        const to2 = (p) => [dot(p, u), dot(p, v)];
        const pa = A.p.map(to2), pb = B.p.map(to2);
        if (area2(pa) < 0) pa.reverse();
        if (area2(pb) < 0) pb.reverse();
        const ov = Math.abs(area2(clip(pa, pb)));
        if (ov < MIN_AREA) continue;
        found.push({ A, B, ov });
      }
    }
  }
  return found
    .map(({ A, B, ov }) => (parts.get(A.node).rank < parts.get(B.node).rank ? { stay: A, move: B, ov } : { stay: B, move: A, ov }))
    .filter((f) => dot(f.move.nrm, f.move.p[0]) - dot(f.move.nrm, f.stay.p[0]) < GAP - 1e-5); // already far enough apart: fine
}

// moves the fighting surfaces apart; returns how many pairs it separated
export function defight(doc) {
  const collected = collect(doc);
  const fights = findFights(doc, collected);
  if (!fights.length) return 0;
  const { parts } = collected;
  // how far each triangle must rise, working from the parts that stay put outwards
  const lift = new Map();
  const liftOf = (t) => lift.get(t) ?? 0;
  for (const f of fights.sort((a, b) => parts.get(a.move.node).rank - parts.get(b.move.node).rank)) {
    const sep = dot(f.move.nrm, f.move.p[0]) - dot(f.move.nrm, f.stay.p[0]);   // along the shared normal; > 0 means move is already above
    const need = Math.max(0, GAP - sep);
    lift.set(f.move, Math.max(liftOf(f.move), liftOf(f.stay) + need));
  }
  // vertex moves, welded by position inside each part so a box stays closed
  const byPart = new Map();
  for (const [t, h] of lift) {
    if (h <= 0) continue;
    (byPart.get(t.node) ?? byPart.set(t.node, []).get(t.node)).push([t, h]);
  }
  for (const [node, list] of byPart) {
    let mesh = node.getMesh();
    if (mesh.listParents().filter((p) => p.propertyType === "Node").length > 1) { // shared mesh: give this node its own copy
      mesh = mesh.clone();
      node.setMesh(mesh);
    }
    const prims = mesh.listPrimitives();
    const toLocal = inv3(node.getWorldMatrix());
    const perPrim = new Map();
    for (const [t, h] of list) (perPrim.get(t.pi) ?? perPrim.set(t.pi, []).get(t.pi)).push([t, h]);
    for (const [pi, items] of perPrim) {
      const prim = prims[pi];
      let pos = prim.getAttribute("POSITION");
      if (pos.listParents().filter((p) => p.propertyType === "Primitive").length > 1) { pos = pos.clone(); prim.setAttribute("POSITION", pos); }
      const arr = pos.getArray().slice();
      const key = (j) => `${Math.round(arr[j * 3] * 1e5)},${Math.round(arr[j * 3 + 1] * 1e5)},${Math.round(arr[j * 3 + 2] * 1e5)}`;
      const groups = new Map();
      for (let j = 0; j < pos.getCount(); j++) (groups.get(key(j)) ?? groups.set(key(j), []).get(key(j))).push(j);
      const move = new Map(); // welded position -> { direction -> height }
      for (const [t, h] of items) for (const j of t.ids) {
        const k = key(j);
        const dir = t.nrm.map((x) => Math.round(x * 100)).join(",");
        const e = move.get(k) ?? move.set(k, new Map()).get(k);
        const cur = e.get(dir);
        if (!cur || cur.h < h) e.set(dir, { n: t.nrm, h });
      }
      for (const [k, dirs] of move) {
        let d = [0, 0, 0];
        for (const { n, h } of dirs.values()) d = [d[0] + n[0] * h, d[1] + n[1] * h, d[2] + n[2] * h];
        const l = toLocal(d);
        for (const j of groups.get(k)) { arr[j * 3] += l[0]; arr[j * 3 + 1] += l[1]; arr[j * 3 + 2] += l[2]; }
      }
      pos.setArray(arr);
    }
  }
  return fights.length;
}

if (process.argv[1]?.endsWith("defight.mjs")) {
  const [inFile, outFile = inFile] = process.argv.slice(2);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(inFile);
  let n = 0, left = 0;
  for (let i = 0; i < 6; i++) { const k = defight(doc); n += k; left = findFights(doc).length; if (!left) break; }
  await io.write(outFile, doc);
  console.log(`${inFile.split("/").pop()}: ${n} fighting triangle pairs separated, ${left} left`);
}
