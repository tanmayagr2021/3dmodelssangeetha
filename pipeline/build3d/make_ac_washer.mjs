// Concept models built from Godrej's public product photos and published dimensions:
//  • Eon Vogue 1.5 T split AC, SIC 18VTC3 WYB — indoor unit 98.2 × 30 × 24.1 cm, Teak / Cypress wood panel
//  • Eon 7 kg front-load washer, WFEON CRS 7010 5.0 FKEDM GLWH — 59.6 × 84 × 51.7 cm, Glacial White
// Each moving part has one clip per change of state: "S<bits>_<bits>", 1 = open.
// Usage: node make_ac_washer.mjs <texDir> <outDir>
import fs from "node:fs";
import path from "node:path";
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

function mat(name, color, { metal = 0, rough = 0.5, opacity = 1, emissive = null, emissiveIntensity = 1, side } = {}) {
  const m = new THREE.MeshStandardMaterial({ name, color, metalness: metal, roughness: rough });
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; }
  if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = emissiveIntensity; }
  if (side) m.side = side;
  return m;
}
const mesh = (name, geo, material, x, y, z) => { const m = new THREE.Mesh(geo, material); m.name = name; m.position.set(x, y, z); return m; };
const box = (name, w, h, d, material, x, y, z) => mesh(name, new THREE.BoxGeometry(w, h, d), material, x, y, z);
const rbox = (name, w, h, d, r, material, x, y, z) => mesh(name, new RoundedBoxGeometry(w, h, d, 4, r), material, x, y, z);
// a flat ring facing +z (inner radius r0, outer r1, thickness t)
function ring(name, r0, r1, t, material, x, y, z, segs = 64) {
  const g = new THREE.LatheGeometry([new THREE.Vector2(r0, 0), new THREE.Vector2(r1, 0), new THREE.Vector2(r1, t), new THREE.Vector2(r0, t), new THREE.Vector2(r0, 0)], segs);
  g.rotateX(Math.PI / 2);
  return mesh(name, g, material, x, y, z + t);
}
function disc(name, r, t, material, x, y, z, segs = 64) {
  const g = new THREE.CylinderGeometry(r, r, t, segs);
  g.rotateX(Math.PI / 2);
  return mesh(name, g, material, x, y, z);
}
// One clip per change of state for N parts, each turning about `axis` between 0 and `angles[i]`.
function stateClips(parts, axis) {
  const n = parts.length, clips = [];
  const q = (a) => new THREE.Quaternion().setFromAxisAngle(axis, a).toArray();
  for (let from = 0; from < 1 << n; from++) {
    for (let to = 0; to < 1 << n; to++) {
      if (from === to) continue;
      const bits = (v) => [...Array(n)].map((_, i) => ((v >> (n - 1 - i)) & 1)).join("");
      const tracks = parts.map(([node, angle], i) => {
        const f = (from >> (n - 1 - i)) & 1, t = (to >> (n - 1 - i)) & 1;
        return new THREE.QuaternionKeyframeTrack(`${node}.quaternion`, [0, 1], [...q(f ? angle : 0), ...q(t ? angle : 0)]);
      });
      clips.push(new THREE.AnimationClip(`S${bits(from)}_${bits(to)}`, 1, tracks));
    }
  }
  return clips;
}
async function exportScene(root, clips) {
  const scene = new THREE.Scene();
  scene.add(root);
  return new GLTFExporter().parseAsync(scene, { binary: true, animations: clips, onlyVisible: true });
}
// Swap a placeholder material for textured variants (KHR_materials_variants).
async function addVariants(raw, placeholder, variants, out) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.readBinary(new Uint8Array(raw));
  if (variants.length) {
    const ext = doc.createExtension(KHRMaterialsVariants);
    const base = doc.getRoot().listMaterials().find((m) => m.getName() === placeholder);
    const mats = variants.map(([vname, file], i) => {
      const tex = doc.createTexture(vname).setImage(new Uint8Array(fs.readFileSync(file))).setMimeType("image/jpeg");
      const m = i === 0 ? base : base.clone();
      return m.setName(`${placeholder}${vname.replace(/\s/g, "")}`).setBaseColorFactor([1, 1, 1, 1]).setBaseColorTexture(tex);
    });
    const vs = variants.map(([vname]) => ext.createVariant(vname));
    for (const me of doc.getRoot().listMeshes()) for (const p of me.listPrimitives()) {
      if (p.getMaterial() !== mats[0]) continue;
      const list = ext.createMappingList();
      mats.forEach((m, i) => list.addMapping(ext.createMapping().setMaterial(m).addVariant(vs[i])));
      p.setExtension("KHR_materials_variants", list);
    }
  }
  fs.writeFileSync(out, await io.writeBinary(doc));
  console.log(out, (fs.statSync(out).size / 1024).toFixed(0) + " KB");
}

// ─────────────── Eon Vogue split AC, indoor unit ───────────────
async function ac() {
  const W = 0.982, H = 0.30, D = 0.241;
  const body = mat("Body", 0xf4f4f1, { metal: 0.05, rough: 0.35 });
  const wood = mat("Wood", 0xffffff, { rough: 0.4 });
  const vent = mat("Vent", 0x2a2d31, { rough: 0.85 });
  const louvreMat = mat("Louvre", 0xeeeeea, { rough: 0.4 });
  const emblem = mat("Emblem", 0xb08d4a, { metal: 0.9, rough: 0.32 });
  const back = mat("Back", 0xd8d8d4, { rough: 0.7 });
  const root = new THREE.Group();
  root.name = "EonVogueAC";
  // hangs on a wall: back at z = 0, front faces +z, bottom at y = 0
  root.add(rbox("Body", W, H, D - 0.012, 0.022, body, 0, H / 2, (D - 0.012) / 2));
  root.add(box("MountPlate", W - 0.1, H - 0.08, 0.008, back, 0, H / 2, 0.004));
  // wood front panel covers the upper part of the front
  const panelH = H * 0.76;
  const panel = rbox("WoodPanel", W - 0.004, panelH, 0.014, 0.006, wood, 0, H - panelH / 2, D - 0.007);
  pan(panel);
  root.add(panel);
  root.add(disc("Emblem", 0.016, 0.002, emblem, 0, H - panelH * 0.55, D + 0.001));
  // air outlet and auto louvre along the bottom
  root.add(rbox("Outlet", W - 0.13, 0.045, D * 0.55, 0.012, vent, 0, 0.032, D * 0.55));
  const louvre = new THREE.Group();
  louvre.name = "Louvre";
  louvre.position.set(0, 0.058, D - 0.02);
  louvre.add(rbox("LouvreBlade", W - 0.15, 0.01, 0.08, 0.004, louvreMat, 0, -0.005, -0.038));
  root.add(louvre);
  const clips = stateClips([["Louvre", THREE.MathUtils.degToRad(-58)]], new THREE.Vector3(1, 0, 0));
  await addVariants(await exportScene(root, clips), "Wood", [["Teak", `${TEX}/teak.jpg`], ["Cypress", `${TEX}/cypress.jpg`]], path.join(OUT, "eon-vogue-ac.glb"));
}
function pan(m) { return m; }

// ─────────────── Eon 7 kg front-load washing machine ───────────────
async function washer() {
  const W = 0.596, H = 0.84, D = 0.517, feet = 0.015;
  const white = mat("Body", 0xf3f4f4, { metal: 0.05, rough: 0.28 });
  const panelMat = mat("Panel", 0xf7f7f7, { rough: 0.32 });
  const ringMat = mat("DoorRing", 0xf1f2f2, { rough: 0.3 });
  const chrome = mat("Chrome", 0xd5d9dd, { metal: 0.95, rough: 0.18 });
  const glass = mat("Glass", 0x1d232a, { rough: 0.05, metal: 0.1, opacity: 0.62 });
  const gasket = mat("Gasket", 0x3a3e43, { rough: 0.8, side: THREE.DoubleSide });
  const drum = mat("Drum", 0xa9afb5, { metal: 0.85, rough: 0.35, side: THREE.DoubleSide });
  const dark = mat("Dark", 0x101418, { rough: 0.15 });
  const led = mat("Led", 0xffb15a, { emissive: 0xff9a3a, emissiveIntensity: 1.2 });
  const base = mat("Base", 0x2a2d31, { rough: 0.8 });
  const root = new THREE.Group();
  root.name = "EonWasher";
  const zf = D / 2; // front face
  const Hc = H - feet, t = 0.012, yMid = feet + Hc / 2;
  const cy = 0.43, R = 0.205, hole = 0.16;
  // hollow cabinet, so the drum is visible through the door opening
  root.add(box("SideLeft", t, Hc, D, white, -W / 2 + t / 2, yMid, 0));
  root.add(box("SideRight", t, Hc, D, white, W / 2 - t / 2, yMid, 0));
  root.add(rbox("Top", W, 0.02, D, 0.008, white, 0, H - 0.01, 0));
  root.add(box("Bottom", W - 2 * t, 0.02, D, white, 0, feet + 0.01, 0));
  root.add(box("Back", W - 2 * t, Hc, t, white, 0, yMid, -D / 2 + t / 2));
  const frontShape = new THREE.Shape();
  frontShape.moveTo(-W / 2, feet); frontShape.lineTo(W / 2, feet); frontShape.lineTo(W / 2, H - 0.02); frontShape.lineTo(-W / 2, H - 0.02); frontShape.lineTo(-W / 2, feet);
  const holePath = new THREE.Path();
  holePath.absarc(0, cy, hole, 0, Math.PI * 2, true);
  frontShape.holes.push(holePath);
  const frontGeo = new THREE.ExtrudeGeometry(frontShape, { depth: t, bevelEnabled: false, curveSegments: 48 });
  root.add(mesh("Front", frontGeo, white, 0, 0, zf - t));
  for (const [fx, fz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) root.add(mesh("Foot", new THREE.CylinderGeometry(0.02, 0.022, feet, 18), base, fx * (W / 2 - 0.05), feet / 2, fz * (D / 2 - 0.05)));
  // control strip: detergent drawer, programme dial, LED display, buttons
  const yPanel = H - 0.075;
  root.add(box("ControlPanel", W - 0.02, 0.12, 0.004, panelMat, 0, yPanel, zf + 0.002));
  root.add(rbox("Drawer", 0.2, 0.075, 0.012, 0.006, white, -W / 2 + 0.125, yPanel + 0.005, zf + 0.006));
  root.add(box("DrawerGrip", 0.12, 0.008, 0.006, base, -W / 2 + 0.125, yPanel - 0.028, zf + 0.012));
  root.add(ring("DialRing", 0.032, 0.04, 0.008, chrome, 0.04, yPanel, zf + 0.004));
  root.add(disc("DialCap", 0.032, 0.022, panelMat, 0.04, yPanel, zf + 0.015));
  root.add(rbox("Display", 0.13, 0.042, 0.004, 0.004, dark, W / 2 - 0.115, yPanel + 0.012, zf + 0.005));
  for (let i = 0; i < 3; i++) root.add(box("DisplayLed", 0.018, 0.022, 0.002, led, W / 2 - 0.15 + i * 0.026, yPanel + 0.012, zf + 0.0075));
  for (let i = 0; i < 5; i++) root.add(disc("Button", 0.007, 0.004, chrome, W / 2 - 0.17 + i * 0.026, yPanel - 0.03, zf + 0.006, 20));
  // drum seen through the opening: rubber gasket, steel drum with lifters, back plate
  root.add(ring("Bezel", hole, 0.19, 0.006, panelMat, 0, cy, zf));
  const gasketGeo = new THREE.CylinderGeometry(hole, 0.15, 0.06, 48, 1, true);
  gasketGeo.rotateX(Math.PI / 2);
  root.add(mesh("Gasket", gasketGeo, gasket, 0, cy, zf - 0.03));
  const drumGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 48, 1, true);
  drumGeo.rotateX(Math.PI / 2);
  root.add(mesh("Drum", drumGeo, drum, 0, cy, zf - 0.06 - 0.15));
  root.add(disc("DrumBack", 0.15, 0.004, drum, 0, cy, zf - 0.36));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const lifter = box("Lifter", 0.03, 0.03, 0.26, drum, Math.cos(a) * 0.135, cy + Math.sin(a) * 0.135, zf - 0.2);
    lifter.rotation.z = a;
    root.add(lifter);
  }
  // round door, hinged on the left edge
  const door = new THREE.Group();
  door.name = "Door";
  door.position.set(-R, cy, zf + 0.004);
  door.add(ring("DoorRing", 0.15, R, 0.045, ringMat, R, 0, 0));
  door.add(ring("DoorTrim", 0.148, 0.165, 0.048, chrome, R, 0, 0));
  door.add(disc("DoorGlass", 0.15, 0.012, glass, R, 0, 0.03));
  door.add(rbox("DoorHandle", 0.022, 0.09, 0.02, 0.006, ringMat, R + R - 0.03, 0, 0.05));
  root.add(door);
  // filter cap, bottom right
  root.add(disc("FilterCap", 0.034, 0.006, panelMat, W / 2 - 0.08, 0.1, zf + 0.003));
  const clips = stateClips([["Door", THREE.MathUtils.degToRad(-100)]], new THREE.Vector3(0, 1, 0));
  await addVariants(await exportScene(root, clips), "", [], path.join(OUT, "eon-washer.glb"));
}

await ac();
await washer();
