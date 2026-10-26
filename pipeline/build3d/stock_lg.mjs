// What sits in the LG double-door fridges (251 L, 343 L, 466 L): a vegetarian South Indian kitchen, eggs, juices, water
// and soft drinks, all from food.mjs. Only the heights of the shelves and baskets differ between the three models,
// so they are parameters. Every item is tagged userData.stock = true, so the product page can empty the fridge and
// "organise" the items back in. Nothing here is meat or fish.
// usage in a builder:
//   const stock = LGStock({ T3: `${TEX}/lg_glt3426`, TF: `${TEX}/food`, mats: { clear, clearLight, clearRib, ice } });
//   stock.shelves(cab, { zIn1, s1, s2, s3, fz });  stock.freezer(cab, { zIn1, floor, top });
//   stock.doorFreezer(g, { pw, b1, b2 });          stock.doorFridge(g, { pw, eggY, jarY, botY, canY });
//   ...exportGLB(..., { ...ownTextures, ...stock.textures() })
import { THREE, mat, mesh, box, group, flipV } from "./lib.mjs";
import { Food } from "./food.mjs";

export function LGStock({ T3, TF, mats }) {
  const food = Food();
  const labelMats = {};
  const lbl = (n) => (labelMats[n] ||= mat(n, 0xffffff, { rough: 0.5 }));
  const tag = food.tag;
  const cyl = (name, rt, rb, h, m, x, y, z, seg = 14) => mesh(name, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
  const plane = (name, w, h, m, x, y, z) => mesh(name, flipV(new THREE.PlaneGeometry(w, h)), m, x, y, z);
  const wrap = (name, r, h, m, x, y, z) => mesh(name, flipV(new THREE.CylinderGeometry(r + 0.0009, r + 0.0009, h, 16, 1, true, -Math.PI, Math.PI * 2)), m, x, y, z);
  const M = {
    tub: mat("TubWhite", 0xf7f7f4, { rough: 0.45 }), lidBlue: mat("LidBlue", 0x2f6fb4, { rough: 0.4 }), lidWhite: mat("LidWhite", 0xe9ebee, { rough: 0.5 }),
    steel: mat("KitchenSteel", 0xc4c8cc, { metal: 0.95, rough: 0.28 }), steelDark: mat("KitchenSteelDark", 0x8e9296, { metal: 0.9, rough: 0.35 }),
    amber: mat("GlassAmber", 0xc9892b, { rough: 0.12, opacity: 0.88 }), goldLid: mat("GoldLid", 0xd1a43a, { metal: 0.8, rough: 0.3 }),
    brownGlass: mat("GlassBrown", 0x4a2a16, { rough: 0.12, opacity: 0.94 }), redGlass: mat("GlassRed", 0x992c20, { rough: 0.15, opacity: 0.92 }),
    white: mat("CoconutFlesh", 0xf6f3ea, { rough: 0.5 }), cup: mat("CurdCup", 0xf4f6f8, { rough: 0.45 }),
    butter: mat("ButterWrap", 0xffd24a, { rough: 0.5 }), cheese: mat("CheeseBlock", 0xf1c765, { rough: 0.5 }), paneer: mat("PaneerBlock", 0xf5f3ea, { rough: 0.55 }),
    soup: mat("SambarVessel", 0xb26a22, { rough: 0.45 }), icecream: mat("IceCreamTub", 0x7b4528, { rough: 0.5 }),
    pack: mat("FrozenPack", 0xf1f3f6, { rough: 0.4 }),
    cola: { color: 0x3a1f10, cap: 0xc42b22 }, fanta: { color: 0xe8820e, cap: 0xe07a12 },
  };
  function tub(name, r, h, bodyM, lidM, labelName, x, y, z) {
    const g = group(name, x, y, z);
    g.add(cyl(name + "Body", r, r * 0.93, h, bodyM, 0, h / 2, 0, 14));
    g.add(cyl(name + "Rim", r * 1.04, r * 1.04, 0.006, lidM, 0, h - 0.003, 0, 14));
    g.add(cyl(name + "Lid", r * 1.02, r * 1.02, 0.01, lidM, 0, h + 0.005, 0, 14));
    if (labelName) g.add(wrap(name + "Label", r * 0.965, h * 0.62, lbl(labelName), 0, h * 0.48, 0));
    return tag(g);
  }
  function jar(name, r, h, glassM, lidM, labelName, x, y, z) {
    const g = group(name, x, y, z);
    g.add(cyl(name + "Glass", r, r, h, glassM, 0, h / 2, 0, 14));
    g.add(cyl(name + "Neck", r * 0.9, r, 0.006, glassM, 0, h + 0.002, 0, 14));
    g.add(cyl(name + "Lid", r * 0.98, r * 0.98, 0.016, lidM, 0, h + 0.011, 0, 14));
    if (labelName) g.add(wrap(name + "Label", r, h * 0.55, lbl(labelName), 0, h * 0.5, 0));
    return tag(g);
  }
  function vessel(name, r, h, x, y, z) { // a steel vessel with its lid on
    const g = group(name, x, y, z);
    g.add(cyl(name + "Body", r, r * 0.96, h, M.steel, 0, h / 2, 0, 14));
    g.add(cyl(name + "Lid", r * 1.02, r * 1.02, 0.008, M.steelDark, 0, h + 0.004, 0, 14));
    g.add(cyl(name + "Knob", 0.009, 0.011, 0.012, M.steelDark, 0, h + 0.014, 0, 10));
    for (const s of [-1, 1]) g.add(box(name + "Handle", 0.022, 0.008, 0.01, M.steelDark, s * (r + 0.008), h * 0.8, 0));
    return tag(g);
  }
  function tiffin(name, x, y, z) {
    const g = group(name, x, y, z);
    for (let i = 0; i < 3; i++) { g.add(cyl("TiffinTier", 0.062, 0.062, 0.036, M.steel, 0, 0.018 + i * 0.036, 0, 14)); g.add(cyl("TiffinRim", 0.064, 0.064, 0.004, M.steelDark, 0, 0.036 + i * 0.036, 0, 14)); }
    g.add(cyl("TiffinKnob", 0.01, 0.01, 0.014, M.steelDark, 0, 0.115, 0, 10));
    g.add(box("TiffinBarL", 0.004, 0.14, 0.004, M.steelDark, -0.067, 0.07, 0)); g.add(box("TiffinBarR", 0.004, 0.112, 0.004, M.steelDark, 0.067, 0.056, 0));
    return tag(g);
  }
  function bowl(name, r, x, y, z, fill = M.white) { // a white bowl of curd rice
    const g = group(name, x, y, z);
    g.add(mesh("Bowl", new THREE.LatheGeometry([[0.0001, 0], [r * 0.6, 0.002], [r * 0.9, 0.02], [r, 0.055], [r * 0.97, 0.058], [r * 0.88, 0.056], [r * 0.82, 0.02], [r * 0.5, 0.008], [0.0001, 0.006]].map(([a, b]) => new THREE.Vector2(a, b)), 14), M.cup, 0, 0, 0));
    g.add(cyl("Fill", r * 0.9, r * 0.9, 0.003, fill, 0, 0.05, 0, 14));
    return tag(g);
  }
  const block = (name, w, h, d, m, labelName, x, y, z) => { // a wrapped block (butter, paneer, cheese) with a printed top
    const g = group(name, x, y, z);
    g.add(box(name + "Body", w, h, d, m, 0, h / 2, 0));
    if (labelName) g.add(plane(name + "Label", w * 0.8, d * 0.8, lbl(labelName), 0, h + 0.0006, 0).rotateX(-Math.PI / 2));
    return tag(g);
  };
  const ring = (n, cx, cz, r, k) => [...Array(n)].map((_, i) => [cx + Math.cos(i * 2.4 + k) * r * Math.sqrt(i / n), cz + Math.sin(i * 2.4 + k) * r * Math.sqrt(i / n)]);

  // ── the shelves and the vegetable drawer ──
  function shelves(cab, P) {
    const { zIn1, s1, s2, s3, fz } = P;
    const z0 = P.z0 ?? zIn1 + 0.19;
    // top shelf: dairy, batters, drinks, steel ware
    const a = group("Shelf1Stock", 0, s1 + 0.003, 0);
    a.add(food.carton("OrangeJuice", "carton_orange.jpg", -0.19, 0, z0 + 0.04, 1));
    a.add(food.carton("MangoJuice", "carton_mango.jpg", -0.115, 0, z0 + 0.04, 2));
    a.add(vessel("MilkPot", 0.058, 0.09, -0.02, 0, z0 + 0.045));
    a.add(tiffin("Tiffin", 0.095, 0, z0 + 0.05));
    a.add(jar("ChutneyJar", 0.034, 0.085, M.white, M.lidBlue, null, 0.195, 0, z0 + 0.05));
    a.add(tub("IdliBatterTub", 0.05, 0.09, M.tub, M.lidBlue, "lbl_idli", -0.17, 0, z0 + 0.15));
    a.add(tub("DosaBatterTub", 0.05, 0.09, M.tub, M.lidBlue, "lbl_dosa", -0.065, 0, z0 + 0.15));
    a.add(tub("CurdTub", 0.05, 0.075, M.tub, M.lidWhite, "lbl_curd", 0.04, 0, z0 + 0.15));
    a.add(tub("CurdTub2", 0.05, 0.075, M.tub, M.lidWhite, "lbl_curd", 0.145, 0, z0 + 0.15));
    a.add(block("Paneer", 0.1, 0.035, 0.1, M.paneer, "lbl_paneer", -0.175, 0, z0 + 0.255));
    a.add(food.sachet("MilkPack1", "sachet_milk.jpg", -0.03, 0, z0 + 0.255, 1));
    a.add(food.sachet("MilkPack2", "sachet_milk.jpg", -0.03, 0.026, z0 + 0.255, 2));
    a.add(block("Butter", 0.09, 0.03, 0.05, M.butter, "lbl_butter", 0.12, 0, z0 + 0.245));
    a.add(block("Cheese", 0.08, 0.035, 0.07, M.cheese, null, 0.12, 0, z0 + 0.3));
    cab.add(a);
    if (s3 != null) {
      // second shelf: coconut, melon, curd rice, lemons
      const b = group("Shelf2Stock", 0, s2 + 0.003, 0);
      b.add(food.coconutHalf("CoconutHalf", -0.17, 0, z0 + 0.05, 1));
      b.add(food.coconutHalf("CoconutHalf2", -0.04, 0, z0 + 0.05, 2));
      b.add(food.melonHalf("WatermelonHalf", 0.14, 0, z0 + 0.085, 1));
      b.add(bowl("CurdRiceBowl", 0.06, -0.17, 0, z0 + 0.2));
      b.add(bowl("CurdRiceBowl2", 0.06, -0.05, 0, z0 + 0.2));
      [[0.05, 0.22], [0.1, 0.2], [0.15, 0.225], [0.2, 0.2]].forEach(([x, z], i) => b.add(food.lemon("Lemon", x, 0, z0 + z, i + 1)));
      cab.add(b);
      // third shelf: bananas, apples, oranges, grapes
      const c = group("Shelf3Stock", 0, s3 + 0.003, 0);
      c.add(food.bananaBunch("Bananas", -0.17, 0, z0 + 0.05, 5, 1));
      ring(5, 0.0, z0 + 0.09, 0.06, 1).forEach(([x, z], i) => c.add(food.apple("Apple", x, 0, z, i + 1)));
      c.add(food.grapes("Grapes", 0.14, 0, z0 + 0.06, 1));
      ring(5, -0.05, z0 + 0.22, 0.07, 2).forEach(([x, z], i) => c.add(food.orange("Orange", x, 0, z, i + 3)));
      c.add(bowl("CurdRiceBowl3", 0.06, 0.15, 0, z0 + 0.22));
      cab.add(c);
    } else {
      // a fridge with only two shelves: coconut and all the fruit on the lower one
      const b = group("Shelf2Stock", 0, s2 + 0.003, 0);
      b.add(food.coconutHalf("CoconutHalf", -0.17, 0, z0 + 0.04, 1));
      b.add(food.coconutHalf("CoconutHalf2", -0.05, 0, z0 + 0.04, 2));
      b.add(food.bananaBunch("Bananas", 0.13, 0, z0 + 0.04, 5, 1));
      ring(4, -0.17, z0 + 0.15, 0.045, 1).forEach(([x, z], i) => b.add(food.apple("Apple", x, 0, z, i + 1)));
      ring(4, -0.04, z0 + 0.15, 0.045, 2).forEach(([x, z], i) => b.add(food.orange("Orange", x, 0, z, i + 3)));
      b.add(food.grapes("Grapes", 0.1, 0, z0 + 0.15, 1));
      [[0.17, 0.2], [0.2, 0.14], [0.15, 0.24]].forEach(([x, z], i) => b.add(food.lemon("Lemon", x, 0, z0 + z, i + 1)));
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
    cab.add(v);
  }

  // ── the Fresh 0 Zone tray (butter, paneer, curd cups, cheese) ──
  function fresh0(cab, P) {
    const { y, z, bx = -0.19, px = -0.05, cx = 0.07, ex = 0.2, ez = 0.04 } = P;
    const s = group("F0Stock", 0, y, z);
    s.add(block("Butter1", 0.09, 0.03, 0.05, M.butter, null, bx, 0, -0.04));
    s.add(block("Butter2", 0.09, 0.03, 0.05, M.butter, "lbl_butter", bx, 0, 0.05));
    s.add(block("Paneer", 0.1, 0.05, 0.12, M.paneer, "lbl_paneer", px, 0, -0.02));
    for (const [dx, dz] of [[0, -0.05], [0.045, -0.05], [0, 0.02], [0.045, 0.02]]) s.add(tub("CurdCup", 0.024, 0.05, M.cup, M.lidWhite, null, cx + dx, 0, dz));
    s.add(block("Cheese", 0.08, 0.035, 0.07, M.cheese, null, ex, 0, ez));
    cab.add(s);
  }

  // ── freezer: ice cream, frozen vegetables and parotta, grated coconut ──
  function freezer(cab, P) {
    const { zIn1, floor, top } = P;
    const f = group("FreezerStock", 0, floor, 0), zf = zIn1 + 0.17;
    f.add(tub("IceCreamTub1", 0.07, 0.068, M.icecream, M.icecream, "lbl_icecream", -0.135, 0, zf));
    f.add(tub("IceCreamTub2", 0.07, 0.068, M.cup, M.cup, "lbl_icecream2", -0.135, 0.082, zf));
    f.add(food.sachet("FrozenPeas", "lbl_peas.jpg", -0.01, 0, zIn1 + 0.07, 1, { W: 0.13, D: 0.2, T: 0.03, upright: true }));
    f.add(food.sachet("FrozenCorn", "lbl_corn.jpg", 0.12, 0, zIn1 + 0.07, 2, { W: 0.13, D: 0.2, T: 0.03, upright: true }));
    f.add(food.sachet("FrozenMixedVeg", "lbl_mixveg.jpg", 0.12, 0, zIn1 + 0.2, 3, { W: 0.13, D: 0.2, T: 0.03, upright: true }));
    cab.add(f);
    const t = group("OnFreezerShelf", 0, top, 0);
    t.add(food.sachet("ParottaPack", "lbl_parotta.jpg", -0.03, 0, zIn1 + 0.16, 1, { W: 0.14, D: 0.17, T: 0.03 }));
    t.add(food.sachet("PeasPack", "lbl_peas.jpg", -0.17, 0, zIn1 + 0.15, 2, { W: 0.13, D: 0.17, T: 0.03 }));
    t.add(block("CoconutGratedPack", 0.12, 0.034, 0.15, M.pack, null, 0.12, 0, zIn1 + 0.14));
    cab.add(t);
  }

  // ── door baskets ──
  function doorFreezer(g, P) {
    const { b1, b2, n = 4, gap = 0.13 } = P;
    const packs = ["lbl_peas.jpg", "lbl_parotta.jpg", "lbl_mixveg.jpg", "lbl_corn.jpg"];
    for (let i = 0; i < n; i++) {
      g.add(food.sachet("FzPackA", packs[i], -0.12 - i * gap, b1 + 0.004, -0.042, i + 1, { W: 0.1, D: 0.1, T: 0.02, upright: true }));
      g.add(food.sachet("FzPackB", packs[(i + 2) % 4], -0.12 - i * gap, b2 + 0.004, -0.042, i + 5, { W: 0.1, D: 0.1, T: 0.02, upright: true }));
    }
  }
  function doorFridge(g, P) {
    const { eggY, jarY, botY, canY } = P;
    for (let i = 0; i < 6; i++) g.add(food.egg("Egg", -0.115 - i * 0.056, eggY + 0.006, -0.038, i + 1));
    g.add(jar("GheeJar", 0.03, 0.075, M.amber, M.goldLid, "lbl_ghee", jarY == null ? -0.45 : -0.47, eggY + 0.004, -0.04));
    if (jarY != null) {
      g.add(jar("PickleJar", 0.032, 0.075, M.redGlass, M.goldLid, "lbl_pickle", -0.11, jarY + 0.004, -0.04));
      g.add(jar("ChutneyJar2", 0.034, 0.075, M.white, M.lidBlue, null, -0.19, jarY + 0.004, -0.04));
      g.add(jar("GheeJar2", 0.032, 0.075, M.amber, M.goldLid, "lbl_ghee", -0.27, jarY + 0.004, -0.04));
      g.add(jar("PickleJar2", 0.032, 0.075, M.redGlass, M.goldLid, "lbl_pickle", -0.35, jarY + 0.004, -0.04));
      g.add(jar("SambarPowder", 0.03, 0.07, M.amber, M.lidBlue, null, -0.43, jarY + 0.004, -0.04));
    } else {
      g.add(jar("PickleJar", 0.032, 0.11, M.redGlass, M.goldLid, "lbl_pickle", -0.405, botY + 0.004, -0.045));
    }
    const waterL = lbl("bottle_water");
    const waters = jarY == null ? [[-0.1, -0.045], [-0.1, -0.0125]] : [[-0.1, -0.045], [-0.172, -0.045], [-0.1, -0.0125], [-0.172, -0.0125]];
    waters.forEach(([x, z], i) => g.add(food.petBottle("Water" + i, 0.0345, 0.265, 0xcfe9f7, 0x2f6fb4, x, botY + 0.004, z, waterL, 0.09)));
    g.add(food.petBottle("Cola2L", 0.046, 0.33, M.cola.color, M.cola.cap, -0.255, botY + 0.004, -0.05, lbl("bottle_coke"), 0.11, 0.93));
    if (jarY == null) g.add(food.petBottle("Fanta2L", 0.042, 0.30, M.fanta.color, M.fanta.cap, -0.178, botY + 0.004, -0.05, lbl("bottle_fanta"), 0.1, 0.93));
    else g.add(food.petBottle("Fanta2L", 0.046, 0.33, M.fanta.color, M.fanta.cap, -0.425, botY + 0.004, -0.05, lbl("bottle_fanta"), 0.11, 0.93));
    { // filter-coffee decoction in a brown glass bottle
      const cf = group("CoffeeBottle", -0.335, botY + 0.004, -0.045);
      cf.add(mesh("CoffeeGlass", new THREE.LatheGeometry([[0.0001, 0], [0.03, 0.002], [0.032, 0.01], [0.032, 0.13], [0.028, 0.15], [0.016, 0.17], [0.014, 0.2], [0.0001, 0.2]].map(([a, b]) => new THREE.Vector2(a, b)), 14), M.brownGlass, 0, 0, 0));
      cf.add(cyl("CoffeeCap", 0.017, 0.017, 0.014, M.goldLid, 0, 0.207, 0, 14));
      cf.add(wrap("CoffeeLabel", 0.032, 0.08, lbl("lbl_coffee"), 0, 0.075, 0));
      g.add(tag(cf));
    }
    const cans = [[0xb82a20, "can_coke"], [0xe07a12, "can_fanta"], [0x1a1a1e, "can_thumsup"], [0xb82a20, "can_coke"], [0xe07a12, "can_fanta"], [0x218a40, "can_sprite"]];
    cans.forEach(([col, tex], i) => g.add(food.can("Can", col, -0.075 - i * 0.075, canY + 0.004, -0.04, lbl(tex))));
  }

  return {
    shelves, fresh0, freezer, doorFreezer, doorFridge,
    textures: () => ({
      ...Object.fromEntries(Object.entries(food.textures(TF)).map(([k, f]) => [k, f.split("/").pop().startsWith("lbl_") ? `${T3}/${f.split("/").pop()}` : f])),
      ...Object.fromEntries(Object.keys(labelMats).map((n) => [n, `${n === "bottle_water" ? TF : T3}/${n}.jpg`])),
    }),
  };
}
