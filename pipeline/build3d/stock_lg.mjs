// What sits in the double-door fridges (LG 251 L, 343 L, 466 L and the Samsung 330 L): a vegetarian South Indian kitchen,
// eggs, juices, water and soft drinks. Produce comes from food.mjs; packaged goods wear the real brands' packs (photo
// textures in pipeline/tex/brands, see its manifest.json and CREDITS.md). Only the heights of the shelves and baskets
// differ between the models, so they are parameters. Every item is tagged userData.stock = true, so the product page can
// empty the fridge and "organise" the items back in. Nothing here is meat or fish.
// usage in a builder:
//   const stock = LGStock({ T3: `${TEX}/lg_glt3426`, TF: `${TEX}/food`, BR: `${TEX}/brands` });
//   stock.shelves(cab, { zIn1, inW, inD, s1, s2, s3, fz });  stock.fresh0(cab, {...});  stock.freezer(cab, { zIn1, floor, top });
//   stock.doorFreezer(g, { b1, b2, n, gap });                  stock.doorFridge(g, { eggY, jarY, botY, canY });
//   ...exportGLB(..., { ...ownTextures, ...stock.textures() })
import fs from "node:fs";
import { THREE, mat, mesh, box, group, flipV } from "./lib.mjs";
import { Food } from "./food.mjs";

export function LGStock({ T3, TF, BR, BRT = BR }) {
  const food = Food({ brandDir: BRT });   // BR holds manifest.json; BRT the (smaller) textures
  const man = {};
  try {
    const raw = JSON.parse(fs.readFileSync(`${BR}/manifest.json`, "utf8"));
    const list = Array.isArray(raw) ? raw : raw.items ?? Object.entries(raw).map(([name, v]) => ({ name, ...v }));
    for (const it of list) man[it.name ?? it.file.replace(/\.jpg$/, "")] = it;
  } catch { /* brand packs missing: sizes fall back to defaults */ }
  const labelMats = {};
  const lbl = (n) => (labelMats[n] ||= mat(n, 0xffffff, { rough: 0.5 }));
  const brand = (k) => lbl("br_" + k);                                  // a material that wears pipeline/tex/brands/<k>.jpg
  const sz = (k, d = [100, 100, 30]) => (man[k]?.real_size_mm ?? d).map((v) => v / 1000);
  const asp = (k, d = 1) => man[k]?.aspect ?? d;
  const tag = food.tag;
  const cyl = (name, rt, rb, h, m, x, y, z, seg = 14) => mesh(name, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
  const plane = (name, w, h, m, x, y, z) => mesh(name, flipV(new THREE.PlaneGeometry(w, h)), m, x, y, z);
  const arcFor = (w, r) => 2 * Math.asin(Math.min(0.98, w / (2 * r)));  // the arc a flat photo of width w covers on a cylinder of radius r
  const wrap = (name, r, h, m, x, y, z, arc = 2.6) => mesh(name, flipV(new THREE.CylinderGeometry(r + 0.0009, r + 0.0009, h, 16, 1, true, -arc / 2, arc)), m, x, y, z);
  const M = {
    tub: mat("TubWhite", 0xf7f7f4, { rough: 0.45 }), lidBlue: mat("LidBlue", 0x2f6fb4, { rough: 0.4 }), lidWhite: mat("LidWhite", 0xe9ebee, { rough: 0.5 }),
    steel: mat("KitchenSteel", 0xc4c8cc, { metal: 0.95, rough: 0.28 }), steelDark: mat("KitchenSteelDark", 0x8e9296, { metal: 0.9, rough: 0.35 }),
    amber: mat("GlassAmber", 0xc9892b, { rough: 0.12, opacity: 0.88 }), goldLid: mat("GoldLid", 0xd1a43a, { metal: 0.8, rough: 0.3 }),
    jarGreen: mat("JarGreen", 0xe2b830, { rough: 0.2, opacity: 0.95 }),
    white: mat("CoconutFlesh", 0xf6f3ea, { rough: 0.5 }), cup: mat("CurdCup", 0xf4f6f8, { rough: 0.45 }),
    butter: mat("ButterWrap", 0xffd24a, { rough: 0.5 }), cheese: mat("CheeseBlock", 0xf1c765, { rough: 0.5 }),
    iceWhite: mat("IceCreamTub", 0xf1f0ec, { rough: 0.5 }), iceLid: mat("IceCreamLidRim", 0xe8e6e0, { rough: 0.5 }),
  };
  // a round curd cup with the brand's printed lid (a circular photo on the top face)
  function cupWithLid(name, key, r, h, x, y, z) {
    const g = group(name, x, y, z);
    g.add(cyl(name + "Body", r, r * 0.9, h, M.cup, 0, h / 2, 0));
    const top = new THREE.CircleGeometry(r * 1.02, 24); flipV(top);
    g.add(mesh(name + "LidPrint", top, brand(key), 0, h + 0.0022, 0).rotateX(-Math.PI / 2));
    g.add(cyl(name + "LidRim", r * 1.04, r * 1.04, 0.003, M.cup, 0, h - 0.0005, 0));
    return tag(g);
  }
  // a jar whose label is the brand's own photo, wrapped over the front
  function brandJar(name, key, r, h, glassM, lidM, x, y, z) {
    const g = group(name, x, y, z);
    const lh = Math.min(h * 0.8, sz(key, [95, 50, 95])[1]);
    g.add(cyl(name + "Glass", r, r, h, glassM, 0, h / 2, 0, 16));
    g.add(cyl(name + "Lid", r, r, 0.016, lidM, 0, h + 0.008, 0, 16));
    g.add(wrap(name + "Label", r, lh, brand(key), 0, h * 0.5, 0, arcFor(asp(key, 1.2) * lh, r)));
    return tag(g);
  }
  // a round white paper tub (Nandhana Palace takeaway) with the brand's printed label wrapped over its front
  function paperTub(name, key, r, h, x, y, z) {
    const g = group(name, x, y, z);
    const lh = Math.min(h * 0.8, sz(key, [105, 52, 105])[1]);
    g.add(cyl(name + "Body", r, r * 0.9, h, M.cup, 0, h / 2, 0, 18));
    g.add(cyl(name + "Lid", r * 1.04, r * 1.04, 0.012, M.cup, 0, h + 0.004, 0, 18));
    g.add(wrap(name + "Label", r, lh, brand(key), 0, h * 0.5, 0, arcFor(asp(key, 2) * lh, r)));
    return tag(g);
  }
  // a round navy tin with a gold lid (RNR Biryani), the brand's lid art on the top face
  function tin(name, key, r, h, x, y, z) {
    const g = group(name, x, y, z);
    g.add(cyl(name + "Body", r, r * 0.97, h, mat("TinNavy", 0x0d1b3e, { metal: 0.55, rough: 0.35 }), 0, h / 2, 0, 24));
    g.add(cyl(name + "Rim", r * 1.02, r * 1.02, 0.008, mat("TinGold", 0xc9a23a, { metal: 0.85, rough: 0.3 }), 0, h + 0.002, 0, 24));
    const top = new THREE.CircleGeometry(r * 0.98, 32); flipV(top);
    g.add(mesh(name + "LidArt", top, brand(key), 0, h + 0.0062, 0).rotateX(-Math.PI / 2));
    return tag(g);
  }
  function vessel(name, r, h, x, y, z) {
    const g = group(name, x, y, z);
    g.add(cyl(name + "Body", r, r * 0.96, h, M.steel, 0, h / 2, 0, 16));
    g.add(cyl(name + "Lid", r * 1.02, r * 1.02, 0.008, M.steelDark, 0, h + 0.004, 0, 16));
    g.add(cyl(name + "Knob", 0.009, 0.011, 0.012, M.steelDark, 0, h + 0.014, 0, 10));
    for (const s of [-1, 1]) g.add(box(name + "Handle", 0.022, 0.008, 0.01, M.steelDark, s * (r + 0.008), h * 0.8, 0));
    return tag(g);
  }
  function tiffin(name, x, y, z) {
    const g = group(name, x, y, z);
    for (let i = 0; i < 3; i++) { g.add(cyl("TiffinTier", 0.062, 0.062, 0.036, M.steel, 0, 0.018 + i * 0.036, 0, 16)); g.add(cyl("TiffinRim", 0.064, 0.064, 0.004, M.steelDark, 0, 0.036 + i * 0.036, 0, 16)); }
    g.add(cyl("TiffinKnob", 0.01, 0.01, 0.014, M.steelDark, 0, 0.115, 0, 10));
    g.add(box("TiffinBarL", 0.004, 0.14, 0.004, M.steelDark, -0.067, 0.07, 0)); g.add(box("TiffinBarR", 0.004, 0.112, 0.004, M.steelDark, 0.067, 0.056, 0));
    return tag(g);
  }
  // a flat wrapped pack (butter, cheese) with the brand's print on its top face
  const brick = (name, key, w, h, d, m, x, y, z) => {
    const g = group(name, x, y, z);
    g.add(box(name + "Body", w, h, d, m, 0, h / 2, 0));
    g.add(plane(name + "Print", w * 0.97, d * 0.97, brand(key), 0, h + 0.0007, 0).rotateX(-Math.PI / 2));
    return tag(g);
  };
  // an ice-cream tub: a white tub with the brand's lid photo on top
  function iceTub(name, key, w, h, d, x, y, z) {
    const g = group(name, x, y, z);
    g.add(box(name + "Body", w, h, d, M.iceWhite, 0, h / 2, 0));
    g.add(box(name + "Rim", w + 0.006, 0.006, d + 0.006, M.iceLid, 0, h - 0.003, 0));
    g.add(plane(name + "Lid", w * 0.94, d * 0.94, brand(key), 0, h + 0.0008, 0).rotateX(-Math.PI / 2));
    return tag(g);
  }
  // soft packs from the manifest's real sizes: lying flat, or standing and facing +z
  const pouch = (name, key, x, y, z, up = false, k = 1) => { const [w, h, d] = sz(key); return food.sachet(name, key + ".jpg", x, y, z, 1, { W: w * k, D: h * k, T: Math.max(0.014, d * 0.62 * k), upright: up }); };
  const carton = (name, key, x, y, z, seed = 1) => { const [w, h, d] = sz(key, [64, 190, 40]); return food.carton(name, key + ".jpg", x, y, z, seed, { W: w, H: h, D: d }); };
  const ring = (n, cx, cz, r, k) => [...Array(n)].map((_, i) => [cx + Math.cos(i * 2.4 + k) * r * Math.sqrt(i / n), cz + Math.sin(i * 2.4 + k) * r * Math.sqrt(i / n)]);

  // keep every item of a stock group inside its compartment: shift each one in x and z (and up off the floor) until its
  // bounding box is within b = { hw, z0, z1, y0 }, so nothing pokes through a drawer front, a shelf rim or a side wall
  const _box = new THREE.Box3();
  function fitAll(grp, b) {
    if (!b) return;
    grp.updateMatrixWorld(true);
    for (const c of grp.children) {
      _box.setFromObject(c);
      if (_box.isEmpty()) continue;
      let dx = 0, dz = 0, dy = 0;
      if (_box.max.x - _box.min.x > 2 * b.hw) dx = -(_box.min.x + _box.max.x) / 2;
      else if (_box.min.x < -b.hw) dx = -b.hw - _box.min.x; else if (_box.max.x > b.hw) dx = b.hw - _box.max.x;
      if (_box.max.z - _box.min.z > b.z1 - b.z0) dz = (b.z0 + b.z1) / 2 - (_box.min.z + _box.max.z) / 2;
      else if (_box.min.z < b.z0) dz = b.z0 - _box.min.z; else if (_box.max.z > b.z1) dz = b.z1 - _box.max.z;
      if (b.y0 != null && _box.min.y < b.y0) dy = b.y0 - _box.min.y;
      c.position.x += dx; c.position.z += dz; c.position.y += dy;
    }
  }

  // ── the shelves and the vegetable drawer ──
  function shelves(cab, P) {
    const { zIn1, s1, s2, s3, fz } = P;
    const z0 = P.z0 ?? zIn1 + 0.19;
    const shelfB = P.shelfB ?? (P.inW ? { hw: P.inW / 2 - 0.03, z0: zIn1 + 0.034, z1: zIn1 + P.inD - 0.052 } : null);
    const drawerB = P.drawerB ?? (P.inW ? { hw: (P.inW - 0.02) / 2 - 0.014, z0: zIn1 + 0.04, z1: zIn1 + (P.inD - 0.08) + 0.004, y0: fz } : null);
    // rows from the back of a shelf to its front, as fractions of its depth
    const zb0 = shelfB ? shelfB.z0 : z0, zb1 = shelfB ? shelfB.z1 : z0 + 0.34;
    const rz = (f) => zb0 + f * (zb1 - zb0);
    // top shelf: cartons, dairy, batter, steel ware
    const a = group("Shelf1Stock", 0, s1 + 0.003, 0);
    a.add(carton("RealMixedFruit", "real_mixed_fruit", -0.195, 0, rz(0.16), 1));
    a.add(carton("RealMango", "real_mango", -0.125, 0, rz(0.16), 2));
    a.add(carton("AmulTaaza", "amul_taaza_carton", -0.055, 0, rz(0.16), 3));
    a.add(carton("RnrBiryaniBox", "rnr_box_front", 0.035, 0, rz(0.15), 5));
    a.add(tiffin("Tiffin", 0.168, 0, rz(0.15)));
    a.add(pouch("IdBatterPouch1", "id_batter", -0.11, 0, rz(0.47), true, 0.9));
    a.add(pouch("IdBatterPouch2", "id_batter", 0.115, 0, rz(0.47), true, 0.9));
    a.add(pouch("NandiniMilk", "nandini_toned_milk", -0.145, 0, rz(0.8)));
    a.add(pouch("AavinMilk", "aavin_milk", 0.02, 0, rz(0.8)));
    a.add(pouch("AmulTaazaPouch", "amul_taaza_pouch", 0.02, 0.028, rz(0.8)));
    a.add(carton("MastiButtermilk", "amul_masti_buttermilk", 0.15, 0, rz(0.78), 4));
    fitAll(a, shelfB);
    cab.add(a);
    if (s3 != null) {
      // second shelf: coconut, melon, curd pouches, lemons
      const b = group("Shelf2Stock", 0, s2 + 0.003, 0);
      b.add(food.coconutHalf("CoconutHalf", -0.17, 0, rz(0.12), 1));
      b.add(food.coconutHalf("CoconutHalf2", -0.04, 0, rz(0.12), 2));
      b.add(food.melonHalf("WatermelonHalf", 0.14, 0, rz(0.2), 1));
      b.add(tin("RnrBiryani", "rnr_tin_lid", 0.075, 0.06, -0.14, 0, rz(0.7)));
      b.add(paperTub("NandhanaPalace", "nandana_tub_wrap", 0.0525, 0.075, 0.0, 0, rz(0.72)));
      b.add(paperTub("NandhanaPalace2", "nandana_tub_wrap", 0.0525, 0.075, 0.115, 0, rz(0.72)));
      fitAll(b, shelfB);
      cab.add(b);
      // third shelf: bananas, apples, oranges, grapes
      const c = group("Shelf3Stock", 0, s3 + 0.003, 0);
      c.add(food.bananaBunch("Bananas", -0.17, 0, rz(0.1), 5, 1));
      ring(5, 0.0, rz(0.28), 0.06, 1).forEach(([x, z], i) => c.add(food.apple("Apple", x, 0, z, i + 1)));
      c.add(food.grapes("Grapes", 0.14, 0, rz(0.14), 1));
      ring(5, -0.05, rz(0.7), 0.07, 2).forEach(([x, z], i) => c.add(food.orange("Orange", x, 0, z, i + 3)));
      c.add(pouch("AmulMastiDahi", "amul_masti_dahi_pouch", 0.14, 0, rz(0.7), false, 0.85));
      [[0.2, 0.16], [0.17, 0.3], [0.21, 0.42]].forEach(([x, f], i) => c.add(food.lemon("Lemon", x, 0, rz(f), i + 1)));
      fitAll(c, shelfB);
      cab.add(c);
    } else {
      // a fridge with only two shelves: coconut, curd and all the fruit on the lower one
      const b = group("Shelf2Stock", 0, s2 + 0.003, 0);
      b.add(food.coconutHalf("CoconutHalf", -0.17, 0, rz(0.1), 1));
      b.add(food.coconutHalf("CoconutHalf2", -0.05, 0, rz(0.1), 2));
      b.add(food.bananaBunch("Bananas", 0.13, 0, rz(0.1), 5, 1));
      ring(4, -0.17, rz(0.42), 0.045, 1).forEach(([x, z], i) => b.add(food.apple("Apple", x, 0, z, i + 1)));
      ring(4, -0.04, rz(0.42), 0.045, 2).forEach(([x, z], i) => b.add(food.orange("Orange", x, 0, z, i + 3)));
      b.add(food.grapes("Grapes", 0.1, 0, rz(0.42), 1));
      b.add(tin("RnrBiryani", "rnr_tin_lid", 0.075, 0.06, -0.13, 0, rz(0.82)));
      b.add(paperTub("NandhanaPalace", "nandana_tub_wrap", 0.0525, 0.075, 0.03, 0, rz(0.82)));
      b.add(paperTub("NandhanaPalace2", "nandana_tub_wrap", 0.0525, 0.075, 0.145, 0, rz(0.82)));
      fitAll(b, shelfB);
      cab.add(b);
    }
    // vegetable drawer: the things a South Indian kitchen cooks with
    const v = group("FreshZoneStock", 0, fz, 0), zv = P.vz0 ?? zIn1 + 0.05, kz = P.vk ?? 1;
    for (let i = 0; i < 5; i++) v.add(food.carrot("Carrot", -0.21 + i * 0.034, 0.0, zv + 0.14 * kz, i + 1));
    for (let i = 0; i < 3; i++) v.add(food.brinjal("Brinjal", -0.1 + i * 0.07, 0, zv + 0.15 * kz, i + 1));
    for (let i = 0; i < 4; i++) v.add(food.drumstick("Drumstick", 0.12 + i * 0.022, 0.0 + (i % 2) * 0.012, zv + 0.045 * kz, i + 1));
    for (let i = 0; i < 8; i++) v.add(food.okra("LadiesFinger", 0.15 + (i % 4) * 0.022, 0.0 + Math.floor(i / 4) * 0.018, zv + 0.25 * kz + Math.floor(i / 4) * 0.02, i + 1));
    ["green", "red", "yellow"].forEach((k, i) => v.add(food.capsicum("Capsicum", -0.19 + i * 0.075, 0, zv + 0.3 * kz, k, i + 1)));
    ring(8, 0.0, zv + 0.37 * kz, 0.12, 3).forEach(([x, z], i) => v.add(food.tomato("Tomato", Math.max(-0.2, Math.min(0.2, x)), 0 + (i > 5 ? 0.05 : 0), Math.min(zv + 0.45 * kz, z), i + 1)));
    for (let i = 0; i < 6; i++) v.add(food.onion("Onion", -0.2 + (i % 3) * 0.075, 0, zv + 0.47 * kz + Math.floor(i / 3) * 0.07, i + 1));
    for (let i = 0; i < 4; i++) v.add(food.potato("Potato", 0.04 + (i % 2) * 0.07, 0, zv + 0.5 * kz + Math.floor(i / 2) * 0.06, i + 1));
    for (let i = 0; i < 10; i++) v.add(food.chilli("GreenChilli", 0.02 + i * 0.006, 0.0 + (i % 2) * 0.008, zv + 0.26 * kz, i + 1));
    v.add(food.herb("Coriander", -0.02, 0, zv + 0.06 * kz, "coriander", 1));
    v.add(food.herb("CurryLeaves", 0.07, 0, zv + 0.09 * kz, "curry", 2));
    v.add(food.cabbage("Cabbage", -0.14, 0, zv + 0.05 * kz, 1));
    v.add(food.cauliflower("Cauliflower", 0.2, 0, zv + 0.1 * kz, 1));
    fitAll(v, drawerB);
    cab.add(v);
  }

  // ── the Fresh 0 Zone tray: butter, curd cups, cheese ──
  function fresh0(cab, P) {
    const { y, z, bx = -0.19, cx = 0.07, ex = -0.05, ez = 0.0 } = P;
    const s = group("F0Stock", 0, y, z);
    s.add(brick("AmulButter1", "amul_butter", 0.085, 0.032, 0.055, M.butter, bx, 0, -0.04));
    s.add(brick("AmulButter2", "amul_butter", 0.085, 0.032, 0.055, M.butter, bx, 0, 0.03));
    s.add(brick("AmulCheese", "amul_cheese_slices", 0.12, 0.03, 0.12, M.cheese, ex, 0, ez));
    for (const [dx, dz] of [[0, -0.035], [0, 0.045], [0.085, 0.005]]) s.add(cupWithLid("AmulMastiCup", "amul_masti_dahi_lid", 0.04, 0.05, cx + dx, 0, dz));
    cab.add(s);
  }

  // ── freezer: Amul ice cream, frozen peas and parotta ──
  function freezer(cab, P) {
    const { zIn1, floor, top } = P;
    const f = group("FreezerStock", 0, floor, 0), zf = zIn1 + 0.17;
    f.add(iceTub("AmulVanillaMagic", "amul_vanilla_magic_lid", 0.16, 0.085, 0.16, -0.13, 0, zf));
    f.add(iceTub("AmulRajbhog", "amul_rajbhog_lid", 0.16, 0.085, 0.16, -0.13, 0.087, zf));
    f.add(pouch("FreshoGreenPeas", "fresho_green_peas", -0.0, 0, zIn1 + 0.07, true, 0.95));
    f.add(pouch("ViswasParotta", "viswas_parotta", 0.13, 0, zIn1 + 0.075, true, 0.85));
    f.add(pouch("NityaParotta", "nitya_parotta", 0.13, 0, zIn1 + 0.2, true, 0.85));
    cab.add(f);
    const t = group("OnFreezerShelf", 0, top, 0);
    t.add(pouch("AmulPaneer", "amul_paneer", -0.03, 0, zIn1 + 0.16, false, 0.85));
    t.add(pouch("FreshoGreenPeas2", "fresho_green_peas", -0.17, 0, zIn1 + 0.15, false, 0.9));
    t.add(pouch("ViswasParotta2", "viswas_parotta", 0.12, 0, zIn1 + 0.14, false, 0.85));
    cab.add(t);
  }

  // ── door baskets ──
  // door items face -z (into the cabinet when the door is shut), so the open door shows their labels to the room
  const face = (o) => { o.rotation.y = Math.PI; return o; };
  function doorFreezer(g, P) {
    const { b1, b2, n = 4, gap = 0.13 } = P;
    const packs = ["fresho_green_peas", "viswas_parotta", "nitya_parotta", "amul_paneer"];
    for (let i = 0; i < n; i++) {
      g.add(face(pouch("FzPackA", packs[i % 4], -0.12 - i * gap, b1 + 0.004, -0.042, true, 0.5)));
      g.add(face(pouch("FzPackB", packs[(i + 2) % 4], -0.12 - i * gap, b2 + 0.004, -0.042, true, 0.5)));
    }
  }
  // a 2.25 L or 1 L PET bottle with the brand's label photo wrapped over its front
  function petBrand(name, key, r, h, liquid, cap, x, y, z, opacity = 0.93) {
    const lh = key === "bisleri_label" ? 0.05 : 0.08;
    return food.petBottle(name, r, h, liquid, cap, x, y, z, brand(key), lh, opacity, arcFor(asp(key, 1.2) * lh, r), 0.095);
  }
  function doorFridge(g, P) {
    const { eggY, jarY, botY, canY } = P;
    for (let i = 0; i < 6; i++) g.add(food.egg("Egg", -0.115 - i * 0.056, eggY + 0.006, -0.038, i + 1));
    g.add(face(brandJar("AavinGhee", "aavin_ghee_jar", 0.034, 0.07, M.amber, M.goldLid, jarY == null ? -0.45 : -0.47, eggY + 0.004, -0.04)));
    if (jarY != null) {
      g.add(face(brandJar("MothersPickle", "mothers_mango_pickle", 0.036, 0.07, M.jarGreen, M.goldLid, -0.11, jarY + 0.004, -0.04)));
      g.add(face(brandJar("MothersPickle2", "mothers_mango_pickle", 0.036, 0.07, M.jarGreen, M.goldLid, -0.2, jarY + 0.004, -0.04)));
      g.add(face(pouch("SakthiSambar", "sakthi_sambar_powder", -0.3, jarY + 0.004, -0.045, true, 0.8)));
      g.add(face(pouch("SakthiSambar2", "sakthi_sambar_powder", -0.375, jarY + 0.004, -0.045, true, 0.8)));
      g.add(face(pouch("NandiniGhee", "nandini_ghee_pouch", -0.46, jarY + 0.004, -0.045, true, 0.7)));
    } else {
      g.add(face(brandJar("MothersPickle", "mothers_mango_pickle", 0.036, 0.1, M.jarGreen, M.goldLid, -0.405, botY + 0.004, -0.045)));
    }
    const compact = jarY == null;
    g.add(face(petBrand("Coke2L", "coke_label", 0.046, 0.33, 0x2a1408, 0xc42b22, -0.1, botY + 0.004, -0.05)));
    g.add(face(petBrand("Fanta2L", "fanta_label", compact ? 0.042 : 0.046, compact ? 0.3 : 0.33, 0xe8820e, 0xe07a12, -0.2, botY + 0.004, -0.05)));
    if (!compact) g.add(face(petBrand("ThumsUp2L", "thumsup_label", 0.046, 0.33, 0x2a1408, 0x1b3a8c, -0.3, botY + 0.004, -0.05)));
    [compact ? -0.285 : -0.385, compact ? -0.35 : -0.455].forEach((x, i) => g.add(face(petBrand("Bisleri" + i, "bisleri_label", 0.0345, 0.265, 0xcfe9f7, 0x1a6fb0, x, botY + 0.004, -0.05, 0.6))));
    const cans = [[0x1b2d72, "thumsup_can", 0.105], [0xb82a20, "coke_label", 0.06], [0xe8820e, "fanta_label", 0.06], [0x0e9a48, "sprite_label", 0.07], [0x1b2d72, "thumsup_can", 0.105], [0xb82a20, "coke_label", 0.06]];
    cans.forEach(([col, key, lh], i) => g.add(face(food.can("Can", col, -0.075 - i * 0.075, canY + 0.004, -0.04, brand(key), arcFor(asp(key, 1) * lh, 0.033), lh))));
  }

  return {
    shelves, fresh0, freezer, doorFreezer, doorFridge,
    textures: () => ({
      ...Object.fromEntries(Object.entries(food.textures(TF)).map(([k, f]) => [k, f.split("/").pop().startsWith("lbl_") ? `${T3}/${f.split("/").pop()}` : f])),
      ...Object.fromEntries(Object.keys(labelMats).map((n) => [n, n.startsWith("br_") ? `${BRT}/${n.slice(3)}.jpg` : `${T3}/${n}.jpg`])),
    }),
  };
}
