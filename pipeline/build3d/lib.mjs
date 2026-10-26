// Shared pieces for the product builders: materials, simple shapes, the door-state
// animation clips, and the GLB export that attaches the photo textures.
import fs from "node:fs";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { defight } from "./defight.mjs";

// GLTFExporter reads blobs with FileReader, which Node lacks
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

export { THREE };

export function mat(name, color, { metal = 0, rough = 0.5, opacity = 1, emissive = null, emissiveIntensity = 1, side = THREE.FrontSide } = {}) {
  const m = new THREE.MeshStandardMaterial({ name, color, metalness: metal, roughness: rough, side });
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; }
  if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = emissiveIntensity; }
  return m;
}

export const mesh = (name, geo, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, material);
  m.name = name;
  m.position.set(x, y, z);
  return m;
};
export const box = (name, w, h, d, material, x, y, z) => mesh(name, new THREE.BoxGeometry(w, h, d), material, x, y, z);
// materials in BoxGeometry face order: +x, -x, +y, -y, +z (front), -z (back)
export const faced = (name, w, h, d, mats, x, y, z) => mesh(name, new THREE.BoxGeometry(w, h, d), mats, x, y, z);

// glTF counts v from the top of the image, three.js from the bottom: flip for photo textures
export const flipV = (geo) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); return geo; };

// Turns a shape inside out, for surfaces seen from inside (a drum, a slot). glTF and Apple's
// AR viewer draw one side only, so the faces themselves must point inward.
export function inward(geo) {
  const idx = geo.index;
  if (idx) for (let i = 0; i < idx.count; i += 3) { const b = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, b); }
  const n = geo.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return geo;
}

export function group(name, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  return g;
}

// A flat front with round holes, UV-mapped so a photo texture lands where it was taken.
export function frontWithHoles(name, w, h, holes, material, depth = 0.003) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
  for (const { x, y, r } of holes) {
    const p = new THREE.Path();
    p.absarc(x, y, r, 0, Math.PI * 2, true);
    s.holes.push(p);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 72 });
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  // glTF counts v down from the top of the image
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, 1 - pos.getY(i) / h);
  return mesh(name, geo, material);
}

// A ring turned around the Z axis from a 2D profile of [radius, z] points.
export function lathe(name, profile, material, segments = 96) {
  const pts = profile.map(([r, z]) => new THREE.Vector2(r, z));
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.rotateX(Math.PI / 2); // lathe turns around Y; stand it up to face +Z
  return mesh(name, geo, material);
}

// One clip per change of state, "S<bits>_<bits>" in the order of `parts`; every clip
// drives every part, so a part that is not moving holds its pose.
export function stateClips(root, parts, seconds = 1) {
  const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  const nodes = parts.map((p) => {
    const n = root.getObjectByName(p.node);
    if (!n) throw new Error(`no node ${p.node}`);
    return n;
  });
  const pose = (p, n, open) => {
    if (p.slide) return ["position", [n.position.x + (open ? p.slide[0] : 0), n.position.y + (open ? p.slide[1] : 0), n.position.z + (open ? p.slide[2] : 0)]];
    return ["quaternion", new THREE.Quaternion().setFromAxisAngle(AX[p.axis], THREE.MathUtils.degToRad(open ? p.angle : 0)).toArray()];
  };
  const states = [...Array(2 ** parts.length).keys()].map((i) => i.toString(2).padStart(parts.length, "0"));
  // Google's Scene Viewer (Android without WebXR) loops the first clip and has no other
  // way to pick one, so the first clip holds everything closed
  const rest = parts.map((p, i) => {
    const [prop, a] = pose(p, nodes[i], false);
    const T = prop === "position" ? THREE.VectorKeyframeTrack : THREE.QuaternionKeyframeTrack;
    return new T(`${p.node}.${prop}`, [0, seconds], [...a, ...a]);
  });
  const clips = [new THREE.AnimationClip("Rest", seconds, rest)];
  for (const from of states) for (const to of states) {
    if (from === to) continue;
    const tracks = parts.map((p, i) => {
      const [prop, a] = pose(p, nodes[i], from[i] === "1");
      const [, b] = pose(p, nodes[i], to[i] === "1");
      const T = prop === "position" ? THREE.VectorKeyframeTrack : THREE.QuaternionKeyframeTrack;
      return new T(`${p.node}.${prop}`, [0, seconds], [...a, ...b]);
    });
    clips.push(new THREE.AnimationClip(`S${from}_${to}`, seconds, tracks));
  }
  return clips;
}

// Exports the scene to GLB, then gives each named material its photo texture.
export async function exportGLB(root, clips, out, textures = {}) {
  const scene = new THREE.Scene();
  scene.add(root);
  const raw = await new GLTFExporter().parseAsync(scene, { binary: true, animations: clips, onlyVisible: true });
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.readBinary(new Uint8Array(raw));
  for (const m of doc.getRoot().listMaterials()) {
    const file = textures[m.getName()];
    if (!file) continue;
    const tex = doc.createTexture(m.getName()).setImage(new Uint8Array(fs.readFileSync(file))).setMimeType(file.endsWith(".png") ? "image/png" : "image/jpeg");
    m.setBaseColorTexture(tex);
    const c = m.getBaseColorFactor();
    m.setBaseColorFactor([1, 1, 1, c[3]]);
  }
  const separated = defight(doc); // surfaces in the same plane flicker: move them 0.8 mm apart
  fs.writeFileSync(out, await io.writeBinary(doc));
  const missing = Object.keys(textures).filter((k) => !doc.getRoot().listMaterials().some((m) => m.getName() === k));
  console.log(out, (fs.statSync(out).size / 1024).toFixed(0) + " KB", clips.length, "clips", `${separated} z-fights separated`, missing.length ? `MISSING MATERIALS: ${missing}` : "");
}

export function productParts(productsPath, id) {
  const p = JSON.parse(fs.readFileSync(productsPath, "utf8")).products.find((x) => x.id === id);
  if (!p) throw new Error(`no product ${id}`);
  return p.parts;
}

// Writes each moving part's bounding box, closed and open, into its products.json entry
// (`zone`), so a tap on the model can tell which part it landed on, for any layout of doors.
export function saveZones(productsPath, id, root, parts) {
  const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  const r3 = (v) => [v.x, v.y, v.z].map((n) => +n.toFixed(3));
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const zone = (n) => {
    const b = new THREE.Box3().setFromObject(n).applyMatrix4(inv);
    return [r3(b.min), r3(b.max)];
  };
  const data = JSON.parse(fs.readFileSync(productsPath, "utf8"));
  const entry = data.products.find((x) => x.id === id);
  for (const p of parts) {
    const n = root.getObjectByName(p.node);
    const pos = n.position.clone(), q = n.quaternion.clone();
    const closed = zone(n);
    if (p.slide) n.position.add(new THREE.Vector3(...p.slide));
    else n.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(AX[p.axis], THREE.MathUtils.degToRad(p.angle)));
    root.updateMatrixWorld(true);
    const open = zone(n);
    n.position.copy(pos); n.quaternion.copy(q); root.updateMatrixWorld(true);
    entry.parts.find((x) => x.key === p.key).zone = { closed, open };
  }
  fs.writeFileSync(productsPath, tidyJSON(data));
  console.log("zones saved for", parts.map((p) => p.key).join(", "));
}

// JSON with two-space indents, short arrays of plain values kept on one line
export const tidyJSON = (o) => JSON.stringify(o, null, 2).replace(/\[\s+([^\[\]{}]*?)\s+\]/g, (m, inner) => "[" + inner.split(/,\s+/).join(", ") + "]") + "\n";
