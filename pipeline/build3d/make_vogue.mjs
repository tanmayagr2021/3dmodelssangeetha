// Concept model of the Godrej Eon Vogue 244 L (RT EONVOGUE 280C), built from Godrej's public
// product photos and published dimensions: H 157 cm × W 60.7 cm × D 64.24 cm.
// Walnut Wood and Oak Wood door finishes are exported as KHR_materials_variants.
// Usage: node make_vogue.mjs <texDir> <out.glb>
import fs from "node:fs";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRMaterialsVariants } from "@gltf-transform/extensions";

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => { this.result = buf; this.onloadend?.(); this.onload?.({ target: this }); });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = `data:${blob.type || "application/octet-stream"};base64,${Buffer.from(buf).toString("base64")}`;
      this.onloadend?.(); this.onload?.({ target: this });
    });
  }
};

const [TEX, OUT] = process.argv.slice(2);

function mat(name, color, { metal = 0, rough = 0.5, opacity = 1, emissive = null, emissiveIntensity = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({ name, color, metalness: metal, roughness: rough });
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; }
  if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = emissiveIntensity; }
  return m;
}
const mesh = (name, geo, material, x, y, z) => { const m = new THREE.Mesh(geo, material); m.name = name; m.position.set(x, y, z); return m; };
const box = (name, w, h, d, material, x, y, z) => mesh(name, new THREE.BoxGeometry(w, h, d), material, x, y, z);
const faced = (name, w, h, d, mats, x, y, z) => mesh(name, new THREE.BoxGeometry(w, h, d), mats, x, y, z);

// ── dimensions (metres) ──
const W = 0.607, H = 1.57, D = 0.6424;
const doorT = 0.05, Dc = D - doorT;
const zBack = -D / 2, zFront = zBack + Dc;
const wall = 0.028, feet = 0.012, baseTop = 0.066;
const doorBottom = 0.07, doorSpan = H - doorBottom, gap = 0.006;
const freezerH = doorSpan * 0.27, fridgeH = doorSpan - freezerH - gap;
const yFreezer = H - freezerH, yDiv = doorBottom + fridgeH;

// ── materials ──
const wood = mat("Wood", 0xffffff, { metal: 0.0, rough: 0.45 });          // texture added after export
const body = mat("Body", 0x2a2c2f, { metal: 0.35, rough: 0.62 });         // sandblasted black sides and top
const base = mat("Base", 0x1d1f22, { rough: 0.75 });
const liner = mat("Liner", 0xe9ebec, { rough: 0.55 });
const gasket = mat("Gasket", 0x6c7075, { rough: 0.8 });
const rim = mat("Rim", 0xcfd3d7, { metal: 0.95, rough: 0.2 });            // stainless strip between the doors
const grip = mat("Grip", 0x141516, { metal: 0.2, rough: 0.5 });
const emblem = mat("Emblem", 0xb08d4a, { metal: 0.9, rough: 0.32 });
const glass = mat("Glass", 0xdcecf2, { rough: 0.05, opacity: 0.3 });
const bin = mat("Bin", 0xe6f1f5, { rough: 0.1, opacity: 0.42 });
const light = mat("Light", 0xffffff, { emissive: 0xfff6e8, emissiveIntensity: 1.2 });
const back = mat("Back", 0x3a3d41, { rough: 0.85 });

const root = new THREE.Group();
root.name = "EonVogue";
const cab = new THREE.Group();
cab.name = "Cabinet";
root.add(cab);

// ── cabinet shell: black outside, light grey inside ──
const shellY0 = feet, shellH = H - feet, shellMid = shellY0 + shellH / 2, zMid = zBack + Dc / 2;
cab.add(faced("SideLeft", wall, shellH, Dc, [liner, body, body, body, body, body], -W / 2 + wall / 2, shellMid, zMid));
cab.add(faced("SideRight", wall, shellH, Dc, [body, liner, body, body, body, body], W / 2 - wall / 2, shellMid, zMid));
cab.add(faced("Top", W - 2 * wall, wall, Dc, [body, body, body, liner, body, body], 0, H - wall / 2, zMid));
cab.add(faced("Floor", W - 2 * wall, baseTop - feet, Dc, [base, base, liner, base, base, base], 0, feet + (baseTop - feet) / 2, zMid));
cab.add(faced("Back", W - 2 * wall, H - wall - baseTop, wall, [back, back, back, back, liner, back], 0, baseTop + (H - wall - baseTop) / 2, zBack + wall / 2));
cab.add(box("BackSkin", W, shellH, 0.004, back, 0, shellMid, zBack - 0.002));
cab.add(box("Divider", W - 2 * wall, 0.045, Dc - wall, liner, 0, yDiv - 0.0225 + gap / 2, zMid + wall / 2));
cab.add(box("Plinth", W - 0.02, baseTop - feet, 0.012, base, 0, feet + (baseTop - feet) / 2, zFront + 0.004));
for (const [fx, fz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
  cab.add(mesh("Foot", new THREE.CylinderGeometry(0.016, 0.018, feet, 18), base, fx * (W / 2 - 0.045), feet / 2, zMid + fz * (Dc / 2 - 0.05)));
}

// ── interior ──
const inW = W - 2 * wall - 0.008, inD = Dc - wall - 0.1, inZ = zBack + wall + inD / 2 + 0.01;
for (const y of [0.62, 0.84, 1.02]) cab.add(box("Shelf", inW, 0.007, inD, glass, 0, y, inZ));
cab.add(box("CrisperLid", inW, 0.007, inD, glass, 0, 0.36, inZ));
cab.add(box("CrisperFront", inW - 0.02, 0.27, 0.008, bin, 0, 0.215, inZ + inD / 2 - 0.004));
cab.add(box("CrisperSide", 0.006, 0.27, inD - 0.02, bin, -inW / 2 + 0.01, 0.215, inZ));
cab.add(box("CrisperSide", 0.006, 0.27, inD - 0.02, bin, inW / 2 - 0.01, 0.215, inZ));
cab.add(box("ControlBox", 0.16, 0.05, 0.12, liner, 0, yDiv - 0.08, zBack + wall + 0.07));
cab.add(box("FridgeLight", 0.12, 0.01, 0.04, light, 0, yDiv - 0.05, zBack + wall + 0.14));
cab.add(box("FreezerShelf", inW, 0.007, inD, glass, 0, yFreezer + freezerH * 0.48, inZ));
cab.add(box("IceTray", 0.22, 0.03, 0.1, liner, -0.1, H - wall - 0.06, zBack + wall + 0.09));

// ── doors: hinged on the right, wood front, recessed grip on the free (left) edge ──
function door(name, y0, h, isFreezer) {
  const pivot = new THREE.Group();
  pivot.name = name;
  pivot.position.set(W / 2, y0, zFront);
  const panelW = W - 0.003;
  const geo = new RoundedBoxGeometry(panelW, h, doorT, 4, 0.005);
  // map every door onto one shared veneer, so the grain runs on from freezer to fridge door
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, (y0 - doorBottom + uv.getY(i) * h) / doorSpan);
  pivot.add(mesh(name + "Panel", geo, wood, -panelW / 2, h / 2, doorT / 2));
  // recessed grip along the free edge
  const gripH = isFreezer ? h * 0.55 : h * 0.4;
  const gripY = isFreezer ? h * 0.35 : h - 0.08 - gripH / 2;
  pivot.add(box(name + "Grip", 0.016, gripH, doorT * 0.6, grip, -panelW + 0.006, gripY, doorT * 0.38));
  // stainless strip where the two doors meet
  pivot.add(box(name + "Rim", panelW - 0.01, 0.005, 0.006, rim, -panelW / 2, isFreezer ? 0.0025 : h - 0.0025, doorT + 0.0015));
  if (isFreezer) {
    const e = mesh("Emblem", new THREE.CylinderGeometry(0.021, 0.021, 0.0025, 40), emblem, -panelW / 2, h - 0.085, doorT + 0.001);
    e.rotation.x = Math.PI / 2;
    pivot.add(e);
  }
  // inside of the door: liner, gasket and bins
  pivot.add(box(name + "Gasket", panelW - 0.02, h - 0.02, 0.006, gasket, -panelW / 2, h / 2, -0.003));
  pivot.add(box(name + "Liner", panelW - 0.06, h - 0.06, 0.01, liner, -panelW / 2, h / 2, -0.008));
  const bins = isFreezer ? [0.32] : [0.18, 0.42, 0.66, 0.86];
  for (const b of bins) {
    pivot.add(box(name + "Bin", panelW - 0.12, 0.075, 0.075, bin, -panelW / 2, b * h, -0.05));
    pivot.add(box(name + "BinBase", panelW - 0.12, 0.006, 0.075, liner, -panelW / 2, b * h - 0.037, -0.05));
  }
  return pivot;
}
root.add(door("FridgeDoor", doorBottom, fridgeH, false));
root.add(door("FreezerDoor", yFreezer, freezerH, true));

// Each door opens on its own. A clip is named by the door state it moves between:
// "S<freezer><fridge>_<freezer><fridge>", 1 = open. Every clip drives both doors, so the
// door that is not moving holds its pose.
const open = THREE.MathUtils.degToRad(105);
const doorQ = (isOpen) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), isOpen ? open : 0).toArray();
const clips = [];
for (const from of ["00", "01", "10", "11"]) {
  for (const to of ["00", "01", "10", "11"]) {
    if (from === to) continue;
    const tracks = [["FreezerDoor", 0], ["FridgeDoor", 1]].map(([node, i]) =>
      new THREE.QuaternionKeyframeTrack(`${node}.quaternion`, [0, 1], [...doorQ(from[i] === "1"), ...doorQ(to[i] === "1")]));
    clips.push(new THREE.AnimationClip(`S${from}_${to}`, 1, tracks));
  }
}

const scene = new THREE.Scene();
scene.add(root);
const raw = await new GLTFExporter().parseAsync(scene, { binary: true, animations: clips, onlyVisible: true });

// ── add the wood textures and the two finishes as material variants ──
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.readBinary(new Uint8Array(raw));
const variants = doc.createExtension(KHRMaterialsVariants);
const walnutTex = doc.createTexture("Walnut").setImage(new Uint8Array(fs.readFileSync(`${TEX}/walnut.jpg`))).setMimeType("image/jpeg");
const oakTex = doc.createTexture("Oak").setImage(new Uint8Array(fs.readFileSync(`${TEX}/oak.jpg`))).setMimeType("image/jpeg");
const woodWalnut = doc.getRoot().listMaterials().find((m) => m.getName() === "Wood");
woodWalnut.setName("WoodWalnut").setBaseColorFactor([1, 1, 1, 1]).setBaseColorTexture(walnutTex);
const woodOak = woodWalnut.clone().setName("WoodOak").setBaseColorTexture(oakTex);
const vWalnut = variants.createVariant("Walnut Wood");
const vOak = variants.createVariant("Oak Wood");
for (const m of doc.getRoot().listMeshes()) {
  for (const p of m.listPrimitives()) {
    if (p.getMaterial() !== woodWalnut) continue;
    const list = variants.createMappingList()
      .addMapping(variants.createMapping().setMaterial(woodWalnut).addVariant(vWalnut))
      .addMapping(variants.createMapping().setMaterial(woodOak).addVariant(vOak));
    p.setExtension("KHR_materials_variants", list);
  }
}
fs.writeFileSync(OUT, await io.writeBinary(doc));
console.log(OUT, (fs.statSync(OUT).size / 1024).toFixed(0) + " KB");
