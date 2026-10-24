// Builds Apple AR Quick Look scenes (iPhone, iPad, Vision Pro) from a product GLB.
// One .usda per finish, with tap-to-open behaviours for every moving part.
//
// Quick Look has no state, so each moving part is written twice: a closed copy and an
// open copy. Tapping the closed copy swings it open, then swaps it for the open copy;
// tapping the open copy does the reverse. The copy not in use is parked: shrunk to a
// speck at its own hinge. Every step is a Transform action, the one kind Quick Look
// runs reliably; no visibility token or Show/Hide action is used, since a part that
// failed to show again would vanish after opening.
//
// usage: node make_usdz.mjs <model.glb> <products.json> <productId> <outDir>
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const [glbPath, productsPath, productId, outDir] = process.argv.slice(2);
const product = JSON.parse(fs.readFileSync(productsPath, "utf8")).products.find((p) => p.id === productId);
if (!product) throw new Error(`no product ${productId}`);
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(glbPath);
const root = doc.getRoot();
fs.mkdirSync(path.join(outDir, "textures"), { recursive: true });

const SWING = 0.8; // seconds for a door to open or close
const PARK = 0.001; // scale of a parked copy (a 60 cm door becomes 0.6 mm)
const num = (v) => (Math.abs(v) < 1e-9 ? "0" : String(+v.toPrecision(7)));
const tuple = (a) => `(${a.map(num).join(", ")})`;
// mesh data at the precision it needs: 0.01 mm positions, 3-place normals, 4-place UVs
const fixed = (places) => (a) => `(${a.map((v) => { const r = +v.toFixed(places); return r === 0 ? "0" : String(r); }).join(", ")})`;
const P5 = fixed(5), N3 = fixed(3), U4 = fixed(4);
const safe = (s) => (s || "Node").replace(/[^A-Za-z0-9_]/g, "_").replace(/^([0-9])/, "_$1");

function quatAxisAngle(axis, deg) {
  const h = (deg * Math.PI) / 360;
  const s = Math.sin(h);
  const v = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[axis];
  return [v[0] * s, v[1] * s, v[2] * s, Math.cos(h)]; // x y z w
}
function quatMul(a, b) {
  const [ax, ay, az, aw] = a, [bx, by, bz, bw] = b;
  return [aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz];
}

class Writer {
  constructor() { this.lines = []; this.depth = 0; }
  line(s = "") { this.lines.push(s ? "    ".repeat(this.depth) + s : ""); }
  open(head, meta) {
    if (meta && meta.length) {
      this.line(`${head} (`);
      this.depth++; meta.forEach((m) => this.line(m)); this.depth--;
      this.line(")");
    } else this.line(head);
    this.line("{"); this.depth++;
  }
  close() { this.depth--; this.line("}"); }
  toString() { return this.lines.join("\n") + "\n"; }
}

const variantsExt = root.listExtensionsUsed().find((e) => e.extensionName === "KHR_materials_variants");
const finishes = product.finishes.map((f) => ({ ...f, slug: f.name.toLowerCase().replace(/\s+wood$/, "").replace(/[^a-z0-9]+/g, "-") }));

for (const finish of finishes) {
  const variant = variantsExt && finish.variant ? variantsExt.listVariants().find((v) => v.getName() === finish.variant) : null;
  const materialFor = (prim) => {
    const ext = prim.getExtension("KHR_materials_variants");
    if (variant && ext) for (const m of ext.listMappings()) if (m.listVariants().includes(variant)) return m.getMaterial();
    return prim.getMaterial();
  };

  const usedMaterials = new Map(); // gltf material -> usd name
  const usedNames = new Set();
  const textureFiles = new Map(); // gltf texture -> relative file
  const matName = (m) => {
    if (!usedMaterials.has(m)) {
      let n = safe(m.getName() || "Material"), i = 1;
      while (usedNames.has(n)) n = `${safe(m.getName())}_${i++}`;
      usedNames.add(n);
      usedMaterials.set(m, n);
    }
    return usedMaterials.get(m);
  };

  const w = new Writer();
  w.lines.push(`#usda 1.0
(
    customLayerData = {
        string creator = "Tanmay Agarwal product pipeline"
    }
    defaultPrim = "Root"
    metersPerUnit = 1
    upAxis = "Y"
)
`);

  const sceneRoot = root.listScenes()[0].listChildren()[0];
  const scenePath = "/Root/Scenes/Scene";
  const parts = product.parts || [];
  const partByNode = new Map(parts.map((p) => [p.node, p]));
  const partInfo = new Map(); // node name -> { closedPath, openPath, closedTargets, openTargets, poseClosed, poseOpen, poseAjar }

  // writes a node and its children; returns the paths of xforms that directly hold meshes
  function writeNode(node, parentPath, siblingNames, opts = {}) {
    let name = safe(opts.name || node.getName());
    if (siblingNames.has(name)) { let i = 1; while (siblingNames.has(`${name}_${i}`)) i++; name = `${name}_${i}`; }
    siblingNames.add(name);
    const p = `${parentPath}/${name}`;
    const tapTargets = [];
    w.open(`def Xform "${name}"`);
    const t = opts.translation || node.getTranslation(), r = opts.rotation || node.getRotation(), s = opts.scale || node.getScale();
    const ops = [];
    if (opts.translation || t.some((v) => v !== 0)) { w.line(`double3 xformOp:translate = ${tuple(t)}`); ops.push('"xformOp:translate"'); }
    if (opts.rotation || r[3] !== 1) { w.line(`quatf xformOp:orient = ${tuple([r[3], r[0], r[1], r[2]])}`); ops.push('"xformOp:orient"'); }
    if (s.some((v) => v !== 1)) { w.line(`double3 xformOp:scale = ${tuple(s)}`); ops.push('"xformOp:scale"'); }
    if (ops.length) w.line(`uniform token[] xformOpOrder = [${ops.join(", ")}]`);

    const mesh = node.getMesh();
    if (mesh) {
      tapTargets.push(p);
      if (opts.tappable) {
        // lets Vision Pro accept both direct touch and look-and-pinch on this object
        w.open('def RealityKitComponent "InputTarget"');
        w.line("bool allowsDirectInput = 1");
        w.line("bool allowsIndirectInput = 1");
        w.line('uniform token info:id = "RealityKit.InputTarget"');
        w.close();
      }
      mesh.listPrimitives().forEach((prim, i) => writeMesh(prim, `Geom_${i}`));
    }
    const childNames = new Set(["InputTarget"]);
    for (const child of node.listChildren()) {
      if (opts.inPart || !partByNode.has(child.getName())) {
        tapTargets.push(...writeNode(child, p, childNames, { tappable: opts.tappable, inPart: opts.inPart }));
        continue;
      }
      // a moving part: closed copy, open copy (parked at first), and four empty poses to
      // move between. A part either turns on a hinge (axis + angle) or slides (slide, in metres).
      const part = partByNode.get(child.getName());
      const base = child.getRotation(), t0 = child.getTranslation(), s0 = child.getScale();
      const turn = (k) => (part.slide ? base : quatMul(base, quatAxisAngle(part.axis, part.angle * k)));
      const move = (k) => (part.slide ? t0.map((v, i) => v + part.slide[i] * k) : t0);
      const parked = s0.map((v) => v * PARK);
      const info = { part };
      info.closedTargets = writeNode(child, p, childNames, { tappable: true, inPart: true });
      info.closedPath = `${p}/${[...childNames].pop()}`;
      info.openTargets = writeNode(child, p, childNames, { name: `${child.getName()}_Open`, rotation: turn(0), translation: move(0), scale: parked, tappable: true, inPart: true });
      info.openPath = `${p}/${[...childNames].pop()}`;
      for (const [label, k, scale] of [["PoseClosed", 0, s0], ["PoseOpen", 1, s0], ["PoseAjar", 0.16, s0], ["PoseParked", 0, parked]]) {
        const n = safe(`${child.getName()}_${label}`);
        const rot = turn(k);
        childNames.add(n);
        w.open(`def Xform "${n}"`);
        w.line(`double3 xformOp:translate = ${tuple(move(k))}`);
        w.line(`quatf xformOp:orient = ${tuple([rot[3], rot[0], rot[1], rot[2]])}`);
        w.line(`double3 xformOp:scale = ${tuple(scale)}`);
        w.line('uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:orient", "xformOp:scale"]');
        w.close();
        info[label[0].toLowerCase() + label.slice(1)] = `${p}/${n}`;
      }
      partInfo.set(part.node, info);
    }
    w.close();
    return tapTargets;
  }

  function writeMesh(prim, name) {
    const pos = prim.getAttribute("POSITION"), nor = prim.getAttribute("NORMAL"), uv = prim.getAttribute("TEXCOORD_0");
    const idx = prim.getIndices();
    const count = pos.getCount();
    let indices = idx ? Array.from(idx.getArray()) : [...Array(count).keys()];
    // Quick Look draws one side only: a double-sided material gets its faces written twice
    const m0 = materialFor(prim);
    if (m0?.getDoubleSided()) {
      const back = [];
      for (let i = 0; i < indices.length; i += 3) back.push(indices[i], indices[i + 2], indices[i + 1]);
      indices = indices.concat(back);
    }
    // primitives of one multi-material mesh share a vertex list; keep only the vertices this one uses
    const used = [...new Set(indices)].sort((x, y) => x - y);
    const remap = new Map(used.map((v, i) => [v, i]));
    indices = indices.map((v) => remap.get(v));
    const vec = (acc, n, fmt) => { const out = [], el = []; for (const i of used) { acc.getElement(i, el); out.push(fmt(el.slice(0, n))); } return out.join(", "); };
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity], el = [];
    for (const i of used) { pos.getElement(i, el); for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], el[k]); max[k] = Math.max(max[k], el[k]); } }
    w.open(`def Mesh "${name}"`, ['prepend apiSchemas = ["MaterialBindingAPI"]']);
    w.line(`float3[] extent = [${tuple(min)}, ${tuple(max)}]`);
    w.line(`int[] faceVertexCounts = [${Array(indices.length / 3).fill(3).join(",")}]`);
    w.line(`int[] faceVertexIndices = [${indices.join(",")}]`);
    w.line(`point3f[] points = [${vec(pos, 3, P5)}]`);
    if (nor) { w.line(`normal3f[] normals = [${vec(nor, 3, N3)}] (`); w.line('    interpolation = "vertex"'); w.line(")"); }
    if (uv) {
      const st = []; for (const i of used) { uv.getElement(i, el); st.push(U4([el[0], 1 - el[1]])); }
      w.line(`texCoord2f[] primvars:st = [${st.join(", ")}] (`); w.line('    interpolation = "vertex"'); w.line(")");
    }
    w.line('uniform token subdivisionScheme = "none"');
    const m = materialFor(prim);
    if (m) w.line(`rel material:binding = </Root/Materials/${matName(m)}>`);
    w.close();
  }

  // ── behaviours ──
  const rel = (paths) => (paths.length === 1 ? `<${paths[0]}>` : `[${paths.map((x) => `<${x}>`).join(", ")}]`);
  function action(name, fields) {
    w.open(`def Preliminary_Action "${name}"`);
    fields.forEach((f) => w.line(f));
    w.close();
  }
  const transform = (name, target, pose, duration) => action(name, [
    `rel affectedObjects = <${target}>`,
    `double duration = ${duration > 0 ? duration : 0.000001}`,
    `token easeType = "${duration > 0 ? "inout" : "none"}"`,
    'token info:id = "Transform"',
    'token type = "absolute"',
    `rel xformTarget = <${pose}>`,
  ]);
  function group(name, type, children) {
    w.open(`def Preliminary_Action "${name}"`);
    w.line(`rel actions = ${rel(children.map((c) => c.name))}`);
    w.line('token info:id = "Group"');
    w.line("bool loops = 0");
    w.line("int performCount = 1");
    w.line(`token type = "${type}"`);
    w.line();
    children.forEach((c) => c.write());
    w.close();
  }
  function behavior(name, trigger, act) {
    w.open(`def Preliminary_Behavior "${name}"`);
    w.line("rel triggers = <Trigger>");
    w.line(`rel actions = <${act.name}>`);
    w.line("uniform bool exclusive = 0");
    w.line();
    w.open('def Preliminary_Trigger "Trigger"');
    trigger.forEach((f) => w.line(f));
    w.close();
    act.write();
    w.close();
  }
  const tap = (targets) => [`rel affectedObjects = ${rel(targets)}`, 'token info:id = "TapGesture"'];

  // ── scene ──
  // Floor products anchor to the floor. Wall units get no anchoring at all: with
  // "vertical" Quick Look turns the model so its base faces the wall, while without
  // anchoring it snaps upright to a wall, back first (model-viewer issue #3989).
  const anchored = product.placement !== "wall";
  w.open('def Xform "Root"');
  w.open('def Scope "Scenes"', ['kind = "sceneLibrary"']);
  w.open('def Xform "Scene"', [
    ...(anchored ? ['apiSchemas = ["Preliminary_AnchoringAPI"]'] : []),
    "customData = {",
    "    bool preliminary_collidesWithEnvironment = 0",
    '    string sceneName = "Scene"',
    "}",
    'sceneName = "Scene"',
  ]);
  if (anchored) {
    w.line('token preliminary:anchoring:type = "plane"');
    w.line('token preliminary:planeAnchoring:alignment = "horizontal"');
    w.line();
  }

  w.open('def Xform "Placement"');
  writeNode(sceneRoot, `${scenePath}/Placement`, new Set());
  w.close();

  // tap the closed copy: it swings open, then the open copy takes its place and it parks;
  // tap the open copy: the reverse. The swap is two instant moves in one frame.
  for (const [node, info] of partInfo) {
    const n = safe(node);
    behavior(`Open_${n}`, tap(info.closedTargets), {
      name: "Open",
      write: () => group("Open", "serial", [
        { name: "Swing", write: () => transform("Swing", info.closedPath, info.poseOpen, SWING) },
        { name: "Swap", write: () => group("Swap", "parallel", [
          { name: "PlaceOpen", write: () => transform("PlaceOpen", info.openPath, info.poseOpen, 0) },
          { name: "ParkClosed", write: () => transform("ParkClosed", info.closedPath, info.poseParked, 0) },
        ]) },
      ]),
    });
    behavior(`Close_${n}`, tap(info.openTargets), {
      name: "Close",
      write: () => group("Close", "serial", [
        { name: "Swing", write: () => transform("Swing", info.openPath, info.poseClosed, SWING) },
        { name: "Swap", write: () => group("Swap", "parallel", [
          { name: "PlaceClosed", write: () => transform("PlaceClosed", info.closedPath, info.poseClosed, 0) },
          { name: "ParkOpen", write: () => transform("ParkOpen", info.openPath, info.poseParked, 0) },
        ]) },
      ]),
    });
  }

  // on start: nudge the main part ajar once so people know it moves
  const hint = [...partInfo.values()].find((i) => i.part.hint) || [...partInfo.values()][0];
  if (partInfo.size) {
    behavior("OnStart", ['token info:id = "SceneTransition"', 'token type = "enter"'], {
      name: "Start",
      write: () => group("Start", "serial", [
        { name: "Pause", write: () => action("Pause", ["double duration = 1.2", 'token info:id = "Wait"']) },
        { name: "Ajar", write: () => transform("Ajar", hint.closedPath, hint.poseAjar, 0.45) },
        { name: "Back", write: () => transform("Back", hint.closedPath, hint.poseClosed, 0.45) },
      ]),
    });
  }
  w.close(); // Scene
  w.close(); // Scenes

  // ── materials ──
  w.line();
  w.open('def Scope "Materials"');
  for (const [m, n] of usedMaterials) {
    const mp = `/Root/Materials/${n}`;
    const [r, g, b, a] = m.getBaseColorFactor();
    const tex = m.getBaseColorTexture();
    w.open(`def Material "${n}"`);
    w.line(`token outputs:surface.connect = <${mp}/Surface.outputs:surface>`);
    w.open('def Shader "Surface"');
    w.line('uniform token info:id = "UsdPreviewSurface"');
    if (tex) w.line(`color3f inputs:diffuseColor.connect = <${mp}/BaseColor.outputs:rgb>`);
    else w.line(`color3f inputs:diffuseColor = ${tuple([r, g, b])}`);
    w.line(`float inputs:metallic = ${num(m.getMetallicFactor())}`);
    w.line(`float inputs:roughness = ${num(m.getRoughnessFactor())}`);
    if (m.getAlphaMode() === "BLEND") w.line(`float inputs:opacity = ${num(a)}`);
    const e = m.getEmissiveFactor();
    if (e.some((v) => v > 0)) w.line(`color3f inputs:emissiveColor = ${tuple(e)}`);
    w.line("int inputs:useSpecularWorkflow = 0");
    w.line("token outputs:surface");
    w.close();
    if (tex) {
      if (!textureFiles.has(tex)) {
        const ext = tex.getMimeType() === "image/png" ? "png" : "jpg";
        const file = `textures/${safe(tex.getName() || `tex${textureFiles.size}`).toLowerCase()}.${ext}`;
        fs.writeFileSync(path.join(outDir, file), Buffer.from(tex.getImage()));
        textureFiles.set(tex, file);
      }
      const info = m.getBaseColorTextureInfo();
      const wrap = (v) => ({ 33071: "clamp", 33648: "mirror" })[v] || "repeat";
      w.open('def Shader "StReader"');
      w.line('uniform token info:id = "UsdPrimvarReader_float2"');
      w.line('string inputs:varname = "st"');
      w.line("float2 inputs:fallback = (0, 0)");
      w.line("float2 outputs:result");
      w.close();
      w.open('def Shader "BaseColor"');
      w.line('uniform token info:id = "UsdUVTexture"');
      w.line(`asset inputs:file = @${textureFiles.get(tex)}@`);
      w.line('token inputs:sourceColorSpace = "sRGB"');
      w.line(`float2 inputs:st.connect = <${mp}/StReader.outputs:result>`);
      w.line(`token inputs:wrapS = "${wrap(info.getWrapS())}"`);
      w.line(`token inputs:wrapT = "${wrap(info.getWrapT())}"`);
      if ([r, g, b].some((v) => v !== 1)) w.line(`float4 inputs:scale = ${tuple([r, g, b, 1])}`);
      w.line("float3 outputs:rgb");
      w.close();
    }
    w.close();
  }
  w.close(); // Materials
  w.close(); // Root

  const file = path.join(outDir, `${productId}-${finish.slug}.usda`);
  fs.writeFileSync(file, w.toString());
  console.log("wrote", file, `${(fs.statSync(file).size / 1024).toFixed(0)} KB`, "parts:", [...partInfo.keys()].join(","), "materials:", usedMaterials.size, "textures:", [...textureFiles.values()].join(","));
}
