// Realistic stock for the fridges: vegetarian food, eggs, juices, water and soft drinks.
// Each builder returns a THREE.Group whose origin is the middle of its base (y = 0 is the surface it stands on),
// tagged userData.stock = true so the product page can empty the fridge and "organise" the items back in.
// Shapes are lumpy rather than perfect (seeded noise), and skins are noise textures from tex_food.py.
// usage: import { Food } from "./food.mjs";  const food = Food(); ... food.tomato("Tomato", x, y, z) ...
//        exportGLB(..., { ...food.textures(T + "/food") })   // T = the textures dir; only materials used are listed
import fs from "node:fs";
import path from "node:path";
import { THREE, mat, mesh, group, flipV } from "./lib.mjs";

const hash = (x, y, z) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const s = (t) => t * t * (3 - 2 * t);
  const u = s(fx), v = s(fy), w = s(fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(
    L(L(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), L(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    L(L(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), L(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w);
}

export function Food({ brandDir = null } = {}) {
  const used = new Map();   // material name -> texture file, for the materials this fridge actually uses
  const M = (key, color, o = {}, tex = null) => { const m = mat("fd_" + key, color, o); if (tex) used.set("fd_" + key, tex); return m; };
  const cache = {};
  const C = (key, color, o, tex) => (cache[key] ||= M(key, color, o, tex));
  const tag = (g) => { g.userData.stock = true; return g; };
  const at = (g, x, y, z, rotY = 0) => { g.position.set(x, y, z); g.rotation.y = rotY; return g; };

  // a sphere pushed about by noise and a shape function, so no two are alike
  function blob(r, seed, { sx = 1, sy = 1, sz = 1, lump = 0.04, freq = 2.2, shape = null, seg = 12 } = {}) {
    const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
    const p = g.attributes.position;
    const o = seed * 13.7;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + lump * (vnoise(x * freq + o, y * freq + o, z * freq + o) - 0.5) * 2;
      x *= k; y *= k; z *= k;
      if (shape) [x, y, z] = shape(x, y, z);
      p.setXYZ(i, x * r * sx, y * r * sy, z * r * sz);
    }
    g.computeVertexNormals();
    return g;
  }
  // a lathe from (radius, height) points, base at y = 0
  const lathe = (pts, seg = 14) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  // a tube along a path with a radius that changes along it; ridges give a star-shaped cross-section
  function sweep(path, radiusAt, sides = 10, ridges = 0, ridgeDepth = 0.2) {
    const n = path.length;
    const pos = [], uv = [], idx = [];
    let nrm = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < n; i++) {
      const t = new THREE.Vector3().subVectors(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)]).normalize();
      let b = new THREE.Vector3().crossVectors(t, nrm);
      if (b.lengthSq() < 1e-6) b = new THREE.Vector3(1, 0, 0);
      b.normalize();
      nrm = new THREE.Vector3().crossVectors(b, t).normalize();
      const r = radiusAt(i / (n - 1));
      for (let k = 0; k <= sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        const rr = r * (ridges ? 1 - ridgeDepth * (0.5 + 0.5 * Math.cos(a * ridges)) : 1);
        const v = new THREE.Vector3().copy(path[i]).addScaledVector(nrm, Math.cos(a) * rr).addScaledVector(b, Math.sin(a) * rr);
        pos.push(v.x, v.y, v.z);
        uv.push(k / sides, i / (n - 1));
      }
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) {
      const a = i * (sides + 1) + k, b2 = a + 1, c = a + sides + 1, d = c + 1;
      idx.push(a, c, b2, b2, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  // points of a circular arc of length len bending by `bend` radians, starting at the origin heading +y
  const arc = (len, bend, n = 14) => [...Array(n)].map((_, i) => { const t = i / (n - 1); return new THREE.Vector3((1 - Math.cos(t * bend)) * len / bend, Math.sin(t * bend) * len / bend, 0); });
  const leafShape = (L, W) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(W, L * 0.15, W * 0.9, L * 0.7, 0, L);
    s.bezierCurveTo(-W * 0.9, L * 0.7, -W, L * 0.15, 0, 0);
    return s;
  };
  function leaf(L, W, material) {
    const g = new THREE.ShapeGeometry(leafShape(L, W), 6);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * W) + 0.5, p.getY(i) / L);
    return new THREE.Mesh(g, material);
  }
  const rnd = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ── fruit and vegetables ──
  const green = () => C("stem", 0x4d7a2c, { rough: 0.6 });
  const brown = () => C("stembrown", 0x6a4a2a, { rough: 0.7 });

  function tomato(name, x, y, z, seed = 1) {
    const g = group(name);
    const r = 0.029;
    g.add(mesh("Fruit", blob(r, seed, { sy: 0.86, lump: 0.05, freq: 1.7, shape: (a, b, c) => { const d = Math.hypot(a, c); return [a, b - (b > 0 ? Math.max(0, 1 - d * 4) * 0.12 : 0), c]; } }), C("tomato", 0xffffff, { rough: 0.32 }, "tomato.jpg"), 0, r * 0.86, 0));
    const cal = new THREE.Group(); cal.position.y = r * 1.7;
    for (let i = 0; i < 5; i++) { const l = leaf(0.016, 0.004, C("calyx", 0x4f8a2e, { rough: 0.6, side: THREE.DoubleSide })); l.rotation.set(1.35, i * 1.2566, 0); cal.add(l); }
    g.add(cal);
    return tag(at(g, x, y, z, seed * 1.3));
  }
  function onion(name, x, y, z, seed = 1) {
    const g = group(name);
    g.add(mesh("Bulb", lathe([[0.0001, 0], [0.012, 0.001], [0.03, 0.007], [0.038, 0.022], [0.036, 0.04], [0.026, 0.056], [0.012, 0.066], [0.003, 0.076], [0.0001, 0.078]], 14), C("onion", 0xffffff, { rough: 0.55 }, "onion.jpg"), 0, 0, 0));
    g.add(mesh("Root", new THREE.CylinderGeometry(0.008, 0.002, 0.008, 6), C("root", 0xd8c9a8, { rough: 0.8 }), 0, 0.002, 0));
    return tag(at(g, x, y, z, seed * 1.9));
  }
  function potato(name, x, y, z, seed = 1) {
    const g = group(name);
    g.add(mesh("Tuber", blob(0.03, seed, { sx: 1.25, sy: 0.82, sz: 0.95, lump: 0.1, freq: 1.4, seg: 14 }), C("potato", 0xffffff, { rough: 0.8 }, "potato.jpg"), 0, 0.025, 0));
    return tag(at(g, x, y, z, seed * 2.1));
  }
  function apple(name, x, y, z, seed = 1) {
    const g = group(name);
    const r = 0.036;
    g.add(mesh("Fruit", blob(r, seed, { sy: 0.92, lump: 0.025, freq: 1.5, shape: (a, b, c) => { const d = Math.hypot(a, c); const top = b > 0 ? Math.max(0, 1 - d * 3.2) * 0.28 * b : 0; return [a, b - top, c]; } }), C("apple", 0xffffff, { rough: 0.3 }, "apple.jpg"), 0, r * 0.9, 0));
    g.add(mesh("Stem", new THREE.CylinderGeometry(0.0016, 0.0016, 0.014, 5), brown(), 0, r * 1.75, 0));
    return tag(at(g, x, y, z, seed * 1.1));
  }
  function orange(name, x, y, z, seed = 1) {
    const g = group(name);
    const r = 0.036;
    g.add(mesh("Fruit", blob(r, seed, { sy: 0.95, lump: 0.02, freq: 2.5 }), C("orange", 0xffffff, { rough: 0.55 }, "orange.jpg"), 0, r * 0.95, 0));
    g.add(mesh("Nub", new THREE.SphereGeometry(0.004, 6, 4), green(), 0, r * 1.86, 0));
    return tag(at(g, x, y, z, seed));
  }
  function lemon(name, x, y, z, seed = 1) {
    const g = group(name);
    g.add(mesh("Fruit", lathe([[0.0001, 0], [0.004, 0.003], [0.016, 0.008], [0.026, 0.02], [0.028, 0.034], [0.022, 0.048], [0.012, 0.058], [0.004, 0.062], [0.0001, 0.064]], 14), C("lemon", 0xffffff, { rough: 0.5 }, "lemon.jpg"), 0, 0, 0));
    return tag(at(g, x, y, z, seed * 0.7));
  }
  function banana(name, x, y, z, bend = 0.9, seed = 1) {
    const g = group(name);
    // lay it down: the finger curves in x and runs along z, rising a little
    const lay = arc(0.17, bend, 18).map((p) => new THREE.Vector3(p.x, 0.0, p.y));
    const prof = (t) => 0.018 * Math.min(1, 0.35 + 5 * t) * Math.min(1, 0.3 + 6 * (1 - t)) * (1 - 0.18 * Math.abs(t - 0.45));
    const body = mesh("Finger", sweep(lay, prof, 5, 5, 0.12), C("banana", 0xffffff, { rough: 0.55 }, "banana.jpg"), 0, 0.017, 0);
    g.add(body);
    g.add(mesh("Stalk", new THREE.CylinderGeometry(0.005, 0.006, 0.014, 6), C("bananastalk", 0x5c6a2c, { rough: 0.8 }), 0, 0.017, -0.006).rotateX(Math.PI / 2));
    g.add(mesh("Tip", new THREE.SphereGeometry(0.004, 6, 4), C("bananatip", 0x3a2a14, { rough: 0.8 }), lay[lay.length - 1].x, 0.017, lay[lay.length - 1].z + 0.002));
    return tag(at(g, x, y, z, seed));
  }
  function bananaBunch(name, x, y, z, count = 5, seed = 1) {
    const g = group(name);
    for (let i = 0; i < count; i++) {
      const b = banana("Finger" + i, 0, i * 0.003, 0, 0.7 + 0.1 * (i % 3), seed + i);
      b.userData.stock = false;
      b.position.set((i - (count - 1) / 2) * 0.03, 0.0 + (i % 2) * 0.008, 0);
      b.rotation.y = (i - (count - 1) / 2) * 0.08;
      g.add(b);
    }
    return tag(at(g, x, y, z, ((seed % 3) - 1) * 0.06));
  }
  function carrot(name, x, y, z, seed = 1) {
    const g = group(name);
    const L = 0.15;
    // lying along z, the tip toward +z
    const m = mesh("Root", lathe([[0.0001, 0], [0.004, 0.006], [0.01, 0.04], [0.0145, 0.09], [0.0165, 0.13], [0.0155, 0.15], [0.0001, 0.152]], 12), C("carrot", 0xffffff, { rough: 0.55 }, "carrot.jpg"), 0, 0, 0);
    m.rotation.x = Math.PI / 2; m.position.set(0, 0.016, -L / 2 + 0.0);
    g.add(m);
    for (let i = 0; i < 4; i++) { const s = mesh("Frond", new THREE.CylinderGeometry(0.0012, 0.0018, 0.05, 4), C("carrottop", 0x4f8a2e, { rough: 0.6 }), 0, 0.016 + (i - 1.5) * 0.004, -L / 2 - 0.02); s.rotation.x = Math.PI / 2 + (i - 1.5) * 0.14; g.add(s); }
    return tag(at(g, x, y, z, ((seed % 3) - 1) * 0.1));
  }
  function brinjal(name, x, y, z, seed = 1) {
    const g = group(name);
    const m = mesh("Fruit", lathe([[0.0001, 0], [0.016, 0.004], [0.03, 0.03], [0.034, 0.06], [0.03, 0.1], [0.022, 0.14], [0.016, 0.17], [0.012, 0.19], [0.0001, 0.194]], 14), C("brinjal", 0xffffff, { rough: 0.22 }, "brinjal.jpg"), 0, 0, 0);
    m.rotation.x = Math.PI / 2; m.position.set(0, 0.032, -0.09);
    g.add(m);
    const cap = mesh("Calyx", new THREE.ConeGeometry(0.022, 0.026, 8, 1, true), C("calyxdbl", 0x4f8a2e, { rough: 0.6, side: THREE.DoubleSide }), 0, 0.032, 0.1);
    cap.rotation.x = -Math.PI / 2;
    g.add(cap);
    g.add(mesh("Stalk", new THREE.CylinderGeometry(0.004, 0.005, 0.022, 6), C("calyxdbl2", 0x4f8a2e, { rough: 0.6 }), 0, 0.032, 0.118).rotateX(Math.PI / 2));
    return tag(at(g, x, y, z, ((seed % 3) - 1) * 0.12));
  }
  function capsicum(name, x, y, z, kind = "green", seed = 1) {
    const g = group(name);
    const tex = { green: "capsicum_green.jpg", red: "capsicum_red.jpg", yellow: "capsicum_yellow.jpg" }[kind];
    const col = { green: 0x2e7a2e, red: 0xc02a20, yellow: 0xe8b820 }[kind];
    g.add(mesh("Fruit", blob(0.04, seed, { sy: 1.05, lump: 0.015, freq: 1, seg: 16, shape: (a, b, c) => { const th = Math.atan2(c, a); const k = 1 + 0.09 * Math.cos(th * 3) * (1 - Math.abs(b) * 0.6); return [a * k, b, c * k]; } }), C("capsicum_" + kind, 0xffffff, { rough: 0.25 }, tex), 0, 0.042, 0));
    g.add(mesh("Stem", new THREE.CylinderGeometry(0.004, 0.007, 0.018, 6), C("capstem", 0x3f6b24, { rough: 0.6 }), 0, 0.088, 0));
    void col;
    return tag(at(g, x, y, z, seed));
  }
  function okra(name, x, y, z, seed = 1) {
    const g = group(name);
    const path = [...Array(8)].map((_, i) => new THREE.Vector3(Math.sin(i / 7 * 0.5) * 0.01, 0.008, i / 7 * 0.085));
    g.add(mesh("Pod", sweep(path, (t) => 0.0085 * (1 - 0.8 * t ** 1.5) * (t < 0.06 ? 0.7 : 1), 10, 5, 0.18), C("okra", 0xffffff, { rough: 0.5 }, "okra.jpg"), 0, 0, 0));
    g.add(mesh("Cap", new THREE.ConeGeometry(0.0085, 0.01, 6), C("okracap", 0x4f7a2c, { rough: 0.6 }), 0, 0.008, -0.004).rotateX(-Math.PI / 2));
    return tag(at(g, x, y, z, ((seed % 3) - 1) * 0.1));
  }
  function drumstick(name, x, y, z, seed = 1) {
    const g = group(name);
    const path = [...Array(16)].map((_, i) => new THREE.Vector3(Math.sin(i / 15 * 2.2 + seed) * 0.006, 0.009, i / 15 * 0.34));
    g.add(mesh("Pod", sweep(path, (t) => 0.0085 * (1 - 0.6 * t) * (1 + 0.18 * Math.sin(t * 38)), 8, 3, 0.1), C("drumstick", 0xffffff, { rough: 0.55 }, "drumstick.jpg"), 0, 0, 0));
    return tag(at(g, x, y, z, ((seed % 3) - 1) * 0.04));
  }
  function chilli(name, x, y, z, seed = 1) {
    const g = group(name);
    const path = [...Array(8)].map((_, i) => new THREE.Vector3(Math.sin(i / 7 * 1.2) * 0.012, 0.005, i / 7 * 0.07));
    g.add(mesh("Chilli", sweep(path, (t) => 0.0045 * (1 - 0.85 * t ** 2) * (t < 0.08 ? 0.6 : 1), 6), C("chilli", 0xffffff, { rough: 0.3 }, "chilli.jpg"), 0, 0, 0));
    g.add(mesh("Cap", new THREE.SphereGeometry(0.0052, 6, 4), green(), 0, 0.005, -0.001));
    return tag(at(g, x, y, z, seed));
  }
  function herb(name, x, y, z, kind = "coriander", seed = 1) {
    const g = group(name);
    const r = rnd(seed * 97 + 13);
    const leafM = C(kind === "coriander" ? "leafcor" : "leafcur", kind === "coriander" ? 0x6ab04c : 0x2f7a2d, { rough: 0.6, side: THREE.DoubleSide }, kind === "coriander" ? "leaf.jpg" : "leaf_curry.jpg");
    const stems = kind === "coriander" ? 9 : 5;
    for (let s = 0; s < stems; s++) {
      const a = (s / stems) * Math.PI * 2, tilt = 0.25 + r() * 0.5;
      const stem = new THREE.Group(); stem.rotation.set(Math.PI / 2 - tilt * 0.4, a, 0);
      stem.add(mesh("Stem", new THREE.CylinderGeometry(0.0012, 0.002, 0.09, 4), C("herbstem", 0x78b052, { rough: 0.7 }), 0, 0.045, 0));
      const nl = kind === "coriander" ? 4 : 6;
      for (let i = 0; i < nl; i++) {
        const lf = leaf(kind === "coriander" ? 0.03 : 0.028, kind === "coriander" ? 0.014 : 0.009, leafM);
        lf.position.set(0, 0.04 + i * 0.012, 0); lf.rotation.set(-0.9 + r() * 0.4, (i % 2 ? 1 : -1) * (0.8 + r() * 0.5), r() * 0.5);
        stem.add(lf);
      }
      stem.position.set(0, 0.004, 0);
      g.add(stem);
    }
    return tag(at(g, x, y, z, seed));
  }
  function grapes(name, x, y, z, seed = 1) {
    const g = group(name);
    const r = rnd(seed * 31 + 5);
    const gm = C("grape", 0xffffff, { rough: 0.25 }, "grape.jpg");
    const geo = new THREE.SphereGeometry(0.0085, 7, 5);
    for (let i = 0; i < 30; i++) {
      const t = i / 29, ring = Math.floor(Math.sqrt(i * 2));
      const a = i * 2.4, rad = (1 - t) * 0.026;
      const m = mesh("Grape", geo, gm, Math.cos(a) * rad, 0.07 - t * 0.062 + r() * 0.004, Math.sin(a) * rad);
      m.rotation.set(r() * 3, r() * 3, r() * 3);
      g.add(m); void ring;
    }
    g.add(mesh("Stalk", new THREE.CylinderGeometry(0.0018, 0.0024, 0.03, 5), C("grapestalk", 0x6a5a30, { rough: 0.8 }), 0, 0.083, 0));
    return tag(at(g, x, y, z, seed));
  }
  function cabbage(name, x, y, z, seed = 1) {
    const g = group(name);
    g.add(mesh("Head", blob(0.075, seed, { sy: 0.92, lump: 0.05, freq: 2.4, seg: 14 }), C("cabbage", 0xffffff, { rough: 0.6 }, "cabbage.jpg"), 0, 0.07, 0));
    return tag(at(g, x, y, z, seed * 0.8));
  }
  function cauliflower(name, x, y, z, seed = 1) {
    const g = group(name);
    g.add(mesh("Curd", blob(0.058, seed, { sy: 0.9, lump: 0.16, freq: 6.2, seg: 16 }), C("cauliflower", 0xffffff, { rough: 0.9 }, "cauliflower.jpg"), 0, 0.058, 0.0));
    const lm = C("calyxdbl", 0x4f8a2e, { rough: 0.6, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) { const lf = leaf(0.07, 0.03, lm); lf.position.set(0, 0.012, 0); lf.rotation.set(-1.0 + (i % 2) * 0.25, i * 1.047, 0); g.add(lf); }
    return tag(at(g, x, y, z, seed));
  }
  function coconutHalf(name, x, y, z, seed = 1) {
    const g = group(name);
    // shell: a bowl, its brown fibrous outside, white meat showing inside and at the rim
    const shell = lathe([[0.0001, 0], [0.02, 0.003], [0.045, 0.014], [0.06, 0.035], [0.065, 0.058], [0.064, 0.064]], 14);
    g.add(mesh("Shell", shell, C("coconut_shell", 0xffffff, { rough: 0.9 }, "coconut_shell.jpg"), 0, 0, 0));
    const meat = lathe([[0.063, 0.064], [0.058, 0.0645], [0.054, 0.062], [0.05, 0.055], [0.04, 0.03], [0.022, 0.012], [0.0001, 0.008]], 14);
    g.add(mesh("Meat", meat, C("coconut_flesh", 0xffffff, { rough: 0.6, side: THREE.DoubleSide }, "coconut_flesh.jpg"), 0, 0.0, 0));
    return tag(at(g, x, y, z, seed));
  }
  function melonHalf(name, x, y, z, seed = 1) {
    const g = group(name);
    const hemi = new THREE.SphereGeometry(0.075, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    g.add(mesh("Rind", hemi, C("melon_rind", 0xffffff, { rough: 0.45 }, "melon_rind.jpg"), 0, 0.0, 0).rotateX(Math.PI));
    g.children[0].position.y = 0.06; g.children[0].scale.y = 0.8;
    const disc = new THREE.CircleGeometry(0.0745, 14);
    const d = mesh("Flesh", disc, C("melon_flesh", 0xffffff, { rough: 0.35 }, "melon_flesh.jpg"), 0, 0.06, 0); d.rotation.x = -Math.PI / 2;
    g.add(d);
    return tag(at(g, x, y, z, seed));
  }
  function egg(name, x, y, z, seed = 1) {
    const g = group(name);
    const pts = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14, a = t * Math.PI; const r = 0.0215 * Math.sin(a) * (1 - 0.14 * Math.cos(a)); pts.push([Math.max(0.0001, r), 0.055 * (1 - Math.cos(a)) / 2]); }
    g.add(mesh("Shell", lathe(pts, 12), C("egg", 0xffffff, { rough: 0.7 }, "egg.jpg"), 0, 0, 0));
    return tag(at(g, x, y, z, seed * 1.7));
  }

  // ── drinks and packs ──
  function can(name, bodyColor, x, y, z, labelM = null, labelArc = Math.PI * 2, labelH = 0.092) {
    const g = group(name);
    const r = 0.033;
    const body = lathe([[0.0001, 0], [0.026, 0], [0.029, 0.004], [r, 0.01], [r, 0.108], [0.03, 0.115], [0.0275, 0.119], [0.0285, 0.1205], [0.0285, 0.1225]], 24);
    g.add(mesh("CanBody", body, C("can" + bodyColor.toString(16), bodyColor, { metal: 0.5, rough: 0.35 }), 0, 0, 0));
    g.add(mesh("CanTop", new THREE.CircleGeometry(0.0272, 20), C("canalu", 0xc9ccd0, { metal: 0.9, rough: 0.3 }), 0, 0.1208, 0).rotateX(-Math.PI / 2));
    g.add(mesh("PullTab", new THREE.BoxGeometry(0.014, 0.0008, 0.009), C("canalu", 0xc9ccd0, { metal: 0.9, rough: 0.3 }), 0, 0.122, 0));
    if (labelM) g.add(mesh("CanPrint", flipUV(new THREE.CylinderGeometry(r + 0.0004, r + 0.0004, labelH, 16, 1, true, -labelArc / 2, labelArc)), labelM, 0, 0.011 + labelH / 2, 0));
    return tag(at(g, x, y, z));
  }
  function flipUV(geo) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); return geo; }
  function petBottle(name, r, h, liquidColor, capColor, x, y, z, labelM = null, labelH = 0.09, opacity = 0.7, labelArc = Math.PI * 2, labelY = 0.092) {
    const g = group(name);
    const s = h / 0.26;
    const prof = [[0.0001, 0.002], [r * 0.55, 0.0], [r * 0.9, 0.004 * s], [r, 0.012 * s], [r, 0.150 * s], [r * 0.94, 0.172 * s], [r * 0.70, 0.205 * s], [r * 0.45, 0.228 * s], [r * 0.36, 0.236 * s], [r * 0.36, 0.2395 * s], [r * 0.42, 0.241 * s], [r * 0.42, 0.244 * s], [r * 0.36, 0.2455 * s], [r * 0.36, 0.250 * s]];
    g.add(mesh("Bottle", lathe(prof, 24), C("pet" + liquidColor.toString(16), liquidColor, { rough: 0.08, opacity }), 0, 0, 0));
    g.add(mesh("Cap", new THREE.CylinderGeometry(r * 0.4, r * 0.4, 0.018 * s, 14), C("petcap" + capColor.toString(16), capColor, { rough: 0.4 }), 0, 0.2605 * s, 0));
    if (labelM) g.add(mesh("Label", flipUV(new THREE.CylinderGeometry(r + 0.0006, r + 0.0006, labelH, 16, 1, true, -labelArc / 2, labelArc)), labelM, 0, labelY * s, 0));
    return tag(at(g, x, y, z));
  }
  // a Tetra Brik style carton; W x D is its footprint, H its height (metres). The print is on the front and back faces.
  function carton(name, texFile, x, y, z, seed = 1, { W = 0.064, H = 0.19, D = 0.04 } = {}) {
    const g = group(name);
    const face = C("carton_" + texFile, 0xffffff, { rough: 0.4 }, texFile);
    const plain = C("cartonplain", 0xf2f2ee, { rough: 0.5 });
    g.add(mesh("Pack", flipV(new THREE.BoxGeometry(W, H, D)), [plain, plain, plain, plain, face, face], 0, H / 2, 0));
    g.add(mesh("TopFin", new THREE.BoxGeometry(W * 0.9, 0.004, 0.005), plain, 0, H + 0.002, 0));
    g.add(mesh("Cap", new THREE.CylinderGeometry(0.0075, 0.0075, 0.008, 12), C("cartoncap", 0xe8e8e4, { rough: 0.4 }), W * 0.28, H + 0.0035, D * 0.2));
    return tag(at(g, x, y, z, seed * 0.1));
  }
  // a sealed pillow pack: lying flat (milk, buttermilk) or standing up facing +z (frozen vegetables)
  function sachet(name, texFile, x, y, z, seed = 1, { W = 0.15, D = 0.105, T = 0.026, upright = false } = {}) {
    const g = group(name);
    const m = C("sachet_" + texFile, 0xffffff, { rough: 0.3 }, texFile);
    const back = C("sachetback", 0xe8f0f8, { rough: 0.3 });
    const mk = (up) => {
      const geo = flipV(new THREE.PlaneGeometry(W, D, 14, 8));
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) / (W / 2), v = p.getY(i) / (D / 2);
        const h = T * Math.pow(Math.max(0, 1 - u * u), 0.55) * Math.pow(Math.max(0, 1 - v * v), 0.45);
        p.setZ(i, up ? h : -h);
      }
      geo.computeVertexNormals();
      return geo;
    };
    const top = mesh("Top", mk(true), m, 0, 0, 0);
    const bot = mesh("Bottom", flipFaces(mk(false)), back, 0, 0, 0);
    if (upright) { top.position.y = bot.position.y = D / 2; }
    else { top.position.y = bot.position.y = T * 0.55; top.rotation.x = bot.rotation.x = -Math.PI / 2; }
    g.add(top, bot);
    return tag(at(g, x, y, z, seed * 0.3));
  }
  function flipFaces(geo) {
    const idx = geo.index; for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i + 1), b = idx.getX(i + 2); idx.setX(i + 1, b); idx.setX(i + 2, a); }
    const n = geo.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
    return geo;
  }

  return {
    tomato, onion, potato, apple, orange, lemon, banana, bananaBunch, carrot, brinjal, capsicum, okra, drumstick, chilli, herb,
    grapes, cabbage, cauliflower, coconutHalf, melonHalf, egg, can, petBottle, carton, sachet, tag,
    textures: (dir) => Object.fromEntries([...used].map(([k, f]) => [k, brandDir && fs.existsSync(path.join(brandDir, f)) ? `${brandDir}/${f}` : `${dir}/${f}`])),
  };
}
