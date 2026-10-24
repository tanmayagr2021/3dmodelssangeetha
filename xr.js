// Headset mode for the product page.
// - Meta Quest: passthrough AR ("immersive-ar"). The product stands in your real room at
//   real size; point and press the trigger (or pinch) to open a door, point at the floor to
//   move it, grip and sweep to turn it. Wall units mount on a real wall when the headset
//   can see one.
// - Apple Vision Pro and other headsets: a virtual showroom ("immersive-vr"); look at a
//   door and pinch to open it.
// The page requests the XR session inside the tap handler (browsers require a tap for
// that), then hands the session to runXR.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { partAt, hotspotShown } from "/site.js";

// Sangeetha colours: black, white and the logo orange
const NAVY = "#0E0E0F", PAPER = "#FFFFFF", COPPER = "#F58A29", COPPER_DK = "#B85A12", SLATE = "#5E6066", HAIR = "#E3E3E6";
const FONT = "Outfit, Arial, sans-serif", SERIF = "Outfit, Arial, sans-serif";
const SWING_MS = 900;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

export async function runXR(session, { mode, product, finishIndex = 0, parts = {}, onEnd }) {
  const ar = mode === "ar";
  const cm = (s) => parseFloat(s) / 100;
  const size = { w: cm(product.size.w), h: cm(product.size.h), d: cm(product.size.d) };
  const onWall = product.placement === "wall";

  // ── renderer and reference space ──
  let spaceType = "local-floor";
  try { await session.requestReferenceSpace("local-floor"); } catch { spaceType = "local"; }
  const floorY = spaceType === "local" ? -1.5 : 0; // no floor tracking: assume a standing eye height

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.domElement.style.display = "none";
  document.body.appendChild(renderer.domElement);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType(spaceType);
  renderer.xr.setFoveation?.(0.5);
  await renderer.xr.setSession(session);
  const refSpace = () => renderer.xr.getReferenceSpace();

  // ── scene ──
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.02, 60);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = ar ? 1 : 0.85;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7f70, ar ? 0.35 : 0.55));

  const holder = new THREE.Group(); // the product's spot: on the floor, facing you
  scene.add(holder);
  const mount = new THREE.Group(); // lifts wall units to wall height
  holder.add(mount);

  const sun = new THREE.DirectionalLight(0xffffff, ar ? 1.2 : 1.8);
  sun.position.set(0.9, 4, 1.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -1.8, right: 1.8, top: 2.6, bottom: -1.2, near: 0.1, far: 9 });
  holder.add(sun, sun.target);

  // contact shadow under floor-standing products
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(size.w + 0.35, size.d + 0.35),
    new THREE.MeshBasicMaterial({ map: radialTexture([[0, "rgba(0,0,0,0.42)"], [0.55, "rgba(0,0,0,0.18)"], [1, "rgba(0,0,0,0)"]]), transparent: true, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.002;
  blob.visible = !onWall;
  holder.add(blob);

  // in AR these planes are invisible except for the shadow the product casts on them
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: 0.22 }));
  shadowFloor.rotation.x = -Math.PI / 2;
  shadowFloor.position.y = 0.001;
  shadowFloor.receiveShadow = true;
  shadowFloor.visible = ar && !onWall;
  holder.add(shadowFloor);
  const shadowWall = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.ShadowMaterial({ opacity: 0.25 }));
  shadowWall.receiveShadow = true;
  shadowWall.visible = false;
  mount.add(shadowWall);

  // ── virtual showroom (VR only) ──
  let showroomWall = null;
  if (!ar) {
    scene.background = new THREE.Color(0xe7e2d9);
    scene.fog = new THREE.Fog(0xe7e2d9, 7, 16);
    // many small triangles: one big fan that passes behind the viewer can clip badly
    const floor = new THREE.Mesh(
      new THREE.RingGeometry(0.01, 9, 72, 36),
      new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.85, map: radialTexture([[0, "#ffffff"], [0.35, "#f4f1ec"], [1, "#e7e2d9"]]) })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY;
    floor.receiveShadow = true;
    scene.add(floor);
    showroomWall = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.9), new THREE.MeshStandardMaterial({ color: 0xf2eee7, roughness: 0.95 }));
    wall.position.y = 1.45;
    wall.receiveShadow = true;
    const skirting = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.09, 0.016), new THREE.MeshStandardMaterial({ color: 0xe0d8ca, roughness: 0.8 }));
    skirting.position.set(0, 0.045, 0.008);
    showroomWall.add(wall, skirting);
    showroomWall.position.z = onWall ? -0.004 : -size.d / 2 - 0.05;
    holder.add(showroomWall);
  }

  // ── product ──
  const gltf = await new GLTFLoader().loadAsync(product.glb);
  const model = gltf.scene;
  model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  mount.add(model);
  if (onWall) {
    mount.position.y = 2.05 - size.h / 2; // a typical mounting height
    shadowWall.position.set(0, size.h / 2, -0.002);
  }

  const variantNames = gltf.userData.gltfExtensions?.KHR_materials_variants?.variants?.map((v) => v.name) || [];
  async function applyFinish(i) {
    finishIndex = i;
    const vi = variantNames.indexOf(product.finishes[i]?.variant);
    const jobs = [];
    model.traverse((o) => {
      const ext = o.isMesh && o.userData.gltfExtensions?.KHR_materials_variants;
      if (!ext) return;
      o.userData.originalMaterial ??= o.material;
      const mapping = ext.mappings.find((m) => m.variants.includes(vi));
      if (!mapping) { o.material = o.userData.originalMaterial; return; }
      jobs.push(gltf.parser.getDependency("material", mapping.material).then((m) => { o.material = m; gltf.parser.assignFinalMaterial(o); }));
    });
    await Promise.all(jobs);
    panel.draw();
  }

  // each moving part swings on its hinge (axis + angle) or slides out (slide, in metres)
  const moving = new Map();
  for (const p of product.parts || []) {
    const node = model.getObjectByName(p.node);
    if (!node) continue;
    const closed = node.quaternion.clone();
    const open = p.slide ? closed.clone() : closed.clone().multiply(new THREE.Quaternion().setFromAxisAngle(AXES[p.axis], THREE.MathUtils.degToRad(p.angle)));
    const at = node.position.clone();
    const out = p.slide ? at.clone().add(new THREE.Vector3(...p.slide)) : at.clone();
    const isOpen = !!parts[p.key];
    const s = { part: p, node, closed, open, at, out, isOpen, t: isOpen ? 1 : 0, from: 0, to: isOpen ? 1 : 0, start: 0 };
    node.quaternion.copy(isOpen ? open : closed);
    node.position.copy(isOpen ? out : at);
    node.traverse((o) => { if (o.isMesh) o.userData.partKey = p.key; });
    moving.set(p.key, s);
  }
  function togglePart(key) {
    const s = moving.get(key);
    if (!s) return;
    s.isOpen = !s.isOpen;
    s.from = s.t;
    s.to = s.isOpen ? 1 : 0;
    s.start = performance.now();
    panel.draw();
  }
  // a hit on a moving part's own mesh names it; a hit on the cabinet goes by the parts' zones
  function partFor(hit) {
    if (hit.object.userData.partKey) return hit.object.userData.partKey;
    return partAt(product, partState(), model.worldToLocal(hit.point.clone()));
  }
  const partState = () => Object.fromEntries([...moving].map(([k, s]) => [k, s.isOpen]));

  // ── feature hotspots: orange dots on the model; point at one to read about it ──
  const spotTex = spotTexture();
  const spots = (product.hotspots || []).map((h, i) => {
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.024, 32), new THREE.MeshBasicMaterial({ map: spotTex, transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    const n = new THREE.Vector3(...h.normal).normalize();
    dot.position.set(...h.pos).addScaledVector(n, 0.003);
    dot.quaternion.setFromUnitVectors(AXES.z, n);
    dot.userData.spot = i;
    dot.visible = false;
    model.add(dot);
    return { h, dot, n };
  });
  const card = makeCard();
  scene.add(card.mesh);
  let pinnedSpot = -1;
  function updateSpots() {
    const st = partState();
    const swinging = [...moving.values()].some((s) => s.t !== s.to);
    for (const s of spots) s.dot.visible = hotspotShown(s.h, st) && !swinging;
  }
  const partLabel = (key) => { const s = moving.get(key); return s ? `${s.isOpen ? "Close" : "Open"} ${s.part.label}` : ""; };

  // ── placement ──
  const head = new THREE.Vector3();
  const headForward = new THREE.Vector3(0, 0, -1);
  function faceUser() {
    const dx = head.x - holder.position.x, dz = head.z - holder.position.z;
    holder.rotation.set(0, Math.atan2(dx, dz), 0);
  }
  function placeOnFloor(point) {
    holder.position.set(point.x, floorY, point.z);
    faceUser();
    if (onWall) { mount.position.y = 2.05 - size.h / 2; shadowWall.visible = false; }
    placePanel();
  }
  function placeOnWall(point, normal) {
    holder.position.set(point.x, floorY, point.z);
    holder.rotation.set(0, Math.atan2(normal.x, normal.z), 0);
    mount.position.y = point.y - floorY - size.h / 2;
    shadowWall.visible = ar;
    placePanel();
  }
  function turn(deg) {
    holder.rotation.y += THREE.MathUtils.degToRad(deg);
    placePanel();
  }

  // ── floating panel ──
  const panel = makePanel({
    product,
    get finishIndex() { return finishIndex; },
    moving,
    onAction: (a) => {
      if (a.type === "part") togglePart(a.key);
      else if (a.type === "finish") applyFinish(a.index);
      else if (a.type === "turn") turn(a.deg);
      else if (a.type === "exit") session.end();
    },
  });
  scene.add(panel.mesh);
  // the panel stands on the side the doors don't swing to, a step closer to you
  const panelSide = (product.parts || []).some((p) => p.axis === "y" && p.angle > 0) ? -1 : 1;
  function placePanel() {
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(AXES.y, holder.rotation.y);
    const front = new THREE.Vector3(0, 0, 1).applyAxisAngle(AXES.y, holder.rotation.y);
    panel.mesh.position.copy(holder.position)
      .addScaledVector(right, panelSide * (size.w / 2 + 0.45))
      .addScaledVector(front, onWall ? 0.75 : size.d / 2 + 0.35);
    panel.mesh.position.y = floorY + 1.15;
    panel.mesh.lookAt(head.x, panel.mesh.position.y, head.z);
  }

  // ── pointers ──
  const raycaster = new THREE.Raycaster();
  raycaster.far = 12;
  const tooltip = makeTooltip();
  scene.add(tooltip.sprite);
  const reticle = new THREE.Mesh(new THREE.RingGeometry(0.085, 0.105, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
  reticle.visible = false;
  scene.add(reticle);
  const sources = new Map();
  const hitTestOK = ar && session.requestHitTestSource;

  function addSource(src) {
    const entry = { hover: null, hoverAt: 0, squeeze: null };
    if (src.targetRayMode === "tracked-pointer") {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]);
      entry.line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 }));
      entry.dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      scene.add(entry.line, entry.dot);
      if (hitTestOK) session.requestHitTestSource({ space: src.targetRaySpace }).then((h) => (entry.hts = h)).catch(() => {});
    }
    sources.set(src, entry);
  }
  function removeSource(src) {
    const e = sources.get(src);
    if (!e) return;
    e.line && scene.remove(e.line, e.dot);
    e.hts?.cancel?.();
    sources.delete(src);
  }
  for (const s of session.inputSources) addSource(s);
  session.addEventListener("inputsourceschange", (e) => { e.removed.forEach(removeSource); e.added.forEach(addSource); });

  const mtx = new THREE.Matrix4();
  function rayFromPose(pose) {
    mtx.fromArray(pose.transform.matrix);
    raycaster.ray.origin.setFromMatrixPosition(mtx);
    raycaster.ray.direction.set(0, 0, -1).transformDirection(mtx);
  }
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY);
  const tmp = new THREE.Vector3();
  function pick(frame, entry) {
    const ui = raycaster.intersectObject(panel.mesh, false)[0];
    if (ui) return { type: "ui", point: ui.point, button: panel.buttonAt(ui.uv), distance: ui.distance };
    const hit = raycaster.intersectObject(model, true).find((h) => h.object.visible);
    if (hit?.object.userData.spot != null) return { type: "spot", point: hit.point, spot: hit.object.userData.spot, distance: hit.distance };
    if (hit) return { type: "part", point: hit.point, key: partFor(hit), distance: hit.distance };
    if (!ar && onWall && showroomWall) {
      const w = raycaster.intersectObject(showroomWall, true)[0];
      if (w) return { type: "floor", point: w.point.clone().setY(floorY), distance: w.distance };
    }
    if (frame && entry?.hts) {
      const r = frame.getHitTestResults(entry.hts)[0];
      const pose = r?.getPose(refSpace());
      if (pose) {
        mtx.fromArray(pose.transform.matrix);
        const point = new THREE.Vector3().setFromMatrixPosition(mtx);
        const normal = new THREE.Vector3(0, 1, 0).transformDirection(mtx);
        if (onWall && Math.abs(normal.y) < 0.35) return { type: "wall", point, normal, distance: point.distanceTo(raycaster.ray.origin) };
        if (normal.y > 0.7 && point.y < floorY + 0.25) return { type: "floor", point, distance: point.distanceTo(raycaster.ray.origin) };
      }
    }
    if (raycaster.ray.intersectPlane(floorPlane, tmp) && tmp.distanceTo(raycaster.ray.origin) < 9) {
      return { type: "floor", point: tmp.clone(), distance: tmp.distanceTo(raycaster.ray.origin) };
    }
    return null;
  }
  function act(hit, src) {
    if (!hit) return;
    if (hit.type === "ui" && hit.button) panel.press(hit.button);
    else if (hit.type === "spot") pinnedSpot = pinnedSpot === hit.spot ? -1 : hit.spot;
    else if (hit.type === "part") togglePart(hit.key);
    else if (hit.type === "floor") placeOnFloor(hit.point);
    else if (hit.type === "wall") placeOnWall(hit.point, hit.normal);
    src?.gamepad?.hapticActuators?.[0]?.pulse?.(0.35, 28);
  }
  session.addEventListener("select", (ev) => {
    const entry = sources.get(ev.inputSource);
    // tracked pointers act on what the ray showed in the last frame; gaze-and-pinch is
    // only known at the moment of the pinch
    if (entry?.line && performance.now() - entry.hoverAt < 150) return act(entry.hover, ev.inputSource);
    const pose = ev.frame.getPose(ev.inputSource.targetRaySpace, refSpace());
    if (!pose) return;
    rayFromPose(pose);
    act(pick(null, null), ev.inputSource);
  });
  const yawOf = (dir) => Math.atan2(dir.x, dir.z);
  session.addEventListener("squeezestart", (ev) => {
    const e = sources.get(ev.inputSource);
    if (e) e.squeeze = { start: null, base: holder.rotation.y };
  });
  session.addEventListener("squeezeend", (ev) => {
    const e = sources.get(ev.inputSource);
    if (e?.squeeze) { e.squeeze = null; placePanel(); }
  });

  // ── frame loop ──
  let placed = false, last = performance.now();
  renderer.setAnimationLoop((time, frame) => {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const viewer = frame?.getViewerPose(refSpace());
    if (viewer) {
      mtx.fromArray(viewer.transform.matrix);
      head.setFromMatrixPosition(mtx);
      headForward.set(0, 0, -1).transformDirection(mtx).setY(0).normalize();
      if (!placed) {
        placed = true;
        const dist = onWall ? 1.9 : 1.25 + size.d;
        placeOnFloor(head.clone().addScaledVector(headForward, dist));
      }
    }

    for (const s of moving.values()) {
      if (s.t === s.to) continue;
      const k = Math.min(1, (now - s.start) / SWING_MS);
      s.t = s.from + (s.to - s.from) * ease(k);
      if (k >= 1) s.t = s.to;
      s.node.quaternion.slerpQuaternions(s.closed, s.open, s.t);
      s.node.position.lerpVectors(s.at, s.out, s.t);
    }

    updateSpots();
    let tip = null, ret = null, hoverButton = null, hoverSpot = -1;
    for (const [src, e] of sources) {
      if (!e.line) continue;
      const pose = frame && frame.getPose(src.targetRaySpace, refSpace());
      e.line.visible = e.dot.visible = !!pose;
      if (!pose) continue;
      rayFromPose(pose);
      const hit = pick(frame, e);
      e.hover = hit;
      e.hoverAt = now;
      const len = hit ? hit.distance : 2.5;
      e.line.position.copy(raycaster.ray.origin);
      e.line.lookAt(tmp.copy(raycaster.ray.origin).add(raycaster.ray.direction));
      e.line.scale.set(1, 1, len);
      e.dot.position.copy(raycaster.ray.at(len, tmp));
      if (hit?.type === "part") tip = { text: partLabel(hit.key), point: hit.point };
      else if (hit?.type === "spot") hoverSpot = hit.spot;
      else if (hit?.type === "ui") hoverButton = hit.button;
      else if (hit && !e.squeeze) ret = hit;

      if (e.squeeze) {
        const yaw = yawOf(raycaster.ray.direction);
        if (e.squeeze.start === null) e.squeeze.start = yaw;
        holder.rotation.y = e.squeeze.base + (yaw - e.squeeze.start) * 2.2;
      }
      const ax = src.gamepad?.axes;
      if (ax && ax.length >= 4 && Math.abs(ax[2]) > 0.25) { holder.rotation.y -= ax[2] * dt * 1.8; e.stick = true; }
      else if (e.stick) { e.stick = false; placePanel(); }
    }
    panel.setHover(hoverButton);
    tooltip.show(tip, head);
    if (pinnedSpot >= 0 && !spots[pinnedSpot].dot.visible) pinnedSpot = -1;
    const shown = hoverSpot >= 0 ? hoverSpot : pinnedSpot;
    card.show(shown >= 0 ? spots[shown] : null, head);
    if (ret) {
      reticle.visible = true;
      reticle.position.copy(ret.point);
      reticle.quaternion.setFromUnitVectors(AXES.z, ret.type === "wall" ? ret.normal : AXES.y);
      reticle.position.addScaledVector(ret.type === "wall" ? ret.normal : AXES.y, 0.004);
    } else reticle.visible = false;

    renderer.render(scene, camera);
  });

  session.addEventListener("end", () => {
    renderer.setAnimationLoop(null);
    for (const s of sources.values()) s.hts?.cancel?.();
    renderer.dispose();
    pmrem.dispose();
    renderer.domElement.remove();
    delete window.__xrDebug;
    const state = {};
    for (const [k, s] of moving) state[k] = s.isOpen;
    onEnd?.({ parts: state, finishIndex });
  });

  // read-only view for automated checks
  window.__xrDebug = {
    info: () => ({
      parts: Object.fromEntries([...moving].map(([k, s]) => [k, s.isOpen])),
      finishIndex, spaceType,
      holder: holder.position.toArray(), yaw: holder.rotation.y, head: head.toArray(),
      hovers: [...sources.values()].map((e) => e.hover && { type: e.hover.type, key: e.hover.key, button: e.hover.button?.id, point: e.hover.point?.toArray() }),
    }),
    buttonWorld: (id) => panel.buttonWorld(id)?.toArray(),
    spotWorld: (i) => spots[i] && spots[i].dot.visible ? spots[i].dot.getWorldPosition(new THREE.Vector3()).toArray() : null,
    card: () => card.current,
    partWorld: (key) => { const s = moving.get(key); if (!s) return null; const b = new THREE.Box3().setFromObject(s.node); return b.getCenter(new THREE.Vector3()).toArray(); },
  };

  await applyFinish(finishIndex);
  return { session };
}

// ── helpers (the showroom uses them too) ──
export function radialTexture(stops) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function wrapText(g, text, maxW) {
  const words = text.split(" "), lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export function spotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#FFFFFF";
  g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
  g.fillStyle = COPPER;
  g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 12; g.lineCap = "round";
  g.beginPath(); g.moveTo(64, 38); g.lineTo(64, 90); g.moveTo(38, 64); g.lineTo(90, 64); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// a feature card beside a hotspot: its title and one sentence, turned to face you
export function makeCard() {
  const W = 1024, H = 420, M = 0.36 / W;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W * M, H * M), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthTest: false }));
  mesh.renderOrder = 998;
  mesh.visible = false;
  const api = { mesh, current: null };
  const at = new THREE.Vector3();
  api.show = (spot, head) => {
    mesh.visible = !!spot;
    if (!spot) { api.current = null; return; }
    if (api.current !== spot.h.title) {
      api.current = spot.h.title;
      const g = c.getContext("2d");
      g.clearRect(0, 0, W, H);
      g.font = `400 36px ${FONT}`;
      const lines = wrapText(g, spot.h.text, W - 112).slice(0, 4);
      const h = 150 + lines.length * 50;
      g.fillStyle = "rgba(253,252,249,0.97)";
      roundRect(g, 0, 0, W, h, 40);
      g.fill();
      g.fillStyle = COPPER;
      g.fillRect(56, 44, 60, 6);
      g.fillStyle = NAVY;
      g.font = `600 50px ${FONT}`;
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      g.fillText(spot.h.title, 56, 112);
      g.fillStyle = SLATE;
      g.font = `400 36px ${FONT}`;
      lines.forEach((l, i) => g.fillText(l, 56, 168 + i * 50));
      tex.needsUpdate = true;
    }
    spot.dot.getWorldPosition(at);
    const toHead = head.clone().sub(at).normalize();
    mesh.position.copy(at).addScaledVector(toHead, 0.12);
    mesh.position.y += 0.1;
    mesh.lookAt(head);
  };
  return api;
}

export function makeTooltip() {
  const c = document.createElement("canvas");
  c.width = 640; c.height = 128;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, toneMapped: false }));
  sprite.scale.set(0.2, 0.04, 1);
  sprite.renderOrder = 999;
  sprite.visible = false;
  let current = "";
  return {
    sprite,
    show(tip, head) {
      sprite.visible = !!tip;
      if (!tip) return;
      if (tip.text !== current) {
        current = tip.text;
        const g = c.getContext("2d");
        g.clearRect(0, 0, c.width, c.height);
        g.font = `600 54px ${FONT}`;
        const w = Math.min(c.width - 8, g.measureText(current).width + 76);
        g.fillStyle = NAVY;
        roundRect(g, (c.width - w) / 2, 10, w, 108, 54);
        g.fill();
        g.fillStyle = PAPER;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(current, c.width / 2, 66);
        tex.needsUpdate = true;
      }
      sprite.position.copy(tip.point).addScaledVector(head.clone().sub(tip.point).normalize(), 0.05);
      sprite.position.y += 0.05;
    },
  };
}

function makePanel(ctx) {
  const W = 1024, H = 1400, M = 0.44 / W; // canvas px -> metres
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W * M, H * M), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  mesh.renderOrder = 10;
  let buttons = [], hover = null;
  const swatches = ctx.product.finishes.map((f) => {
    if (!f.swatch) return null;
    const img = new Image();
    img.onload = () => draw();
    img.src = f.swatch;
    return img;
  });

  function button(x, y, w, h, label, action, { pressed = false, swatch = null, color = null } = {}) {
    const isHover = hover && hover.id === `${action.type}:${action.key ?? action.index ?? action.deg ?? ""}`;
    g.fillStyle = pressed ? NAVY : isHover ? "#FDEBDC" : "#FFFFFF";
    roundRect(g, x, y, w, h, 26);
    g.fill();
    g.lineWidth = pressed ? 0 : 3;
    g.strokeStyle = isHover ? NAVY : HAIR;
    if (!pressed) g.stroke();
    let tx = x + 34;
    if (swatch || color) {
      g.save();
      g.beginPath();
      g.arc(x + 58, y + h / 2, 30, 0, Math.PI * 2);
      g.clip();
      if (swatch?.complete && swatch.naturalWidth) g.drawImage(swatch, x + 28, y + h / 2 - 30, 60, 60);
      else { g.fillStyle = color || "#ddd"; g.fill(); }
      g.restore();
      g.strokeStyle = "rgba(0,0,0,0.15)";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x + 58, y + h / 2, 30, 0, Math.PI * 2);
      g.stroke();
      tx = x + 108;
    }
    g.fillStyle = pressed ? PAPER : NAVY;
    g.font = `600 40px ${FONT}`;
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText(label, tx, y + h / 2 + 1);
    buttons.push({ id: `${action.type}:${action.key ?? action.index ?? action.deg ?? ""}`, x, y, w, h, action });
  }
  function label(text, y) {
    g.fillStyle = SLATE;
    g.font = `600 28px ${FONT}`;
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    if (g.letterSpacing !== undefined) g.letterSpacing = "4px";
    g.fillText(text.toUpperCase(), 64, y);
    if (g.letterSpacing !== undefined) g.letterSpacing = "0px";
  }

  function draw() {
    const p = ctx.product;
    buttons = [];
    g.clearRect(0, 0, W, H);
    g.fillStyle = "rgba(253,252,249,0.97)";
    roundRect(g, 0, 0, W, H, 48);
    g.fill();
    g.fillStyle = COPPER;
    g.fillRect(64, 70, 72, 6);

    g.fillStyle = COPPER_DK;
    g.font = `600 30px ${FONT}`;
    g.textBaseline = "alphabetic";
    g.textAlign = "left";
    g.fillText(`${p.brand} · ${p.model}`.toUpperCase(), 64, 136);
    g.fillStyle = NAVY;
    g.font = `500 58px ${SERIF}`;
    let y = 214;
    for (const line of wrapText(g, p.name, W - 128).slice(0, 2)) { g.fillText(line, 64, y); y += 70; }
    g.fillStyle = SLATE;
    g.font = `400 34px ${FONT}`;
    g.fillText(`Real size: ${p.size.w} W × ${p.size.h} H × ${p.size.d} D`, 64, y + 6);
    y += 70;

    const gap = 20, colW = (W - 128 - gap) / 2, bh = 112;
    const parts = [...ctx.moving.values()];
    if (parts.length) {
      label("Open and close", y + 10);
      y += 34;
      parts.forEach((s, i) => {
        const col = parts.length === 1 ? 0 : i % 2;
        const bw = parts.length === 1 ? W - 128 : colW;
        if (i > 0 && col === 0) y += bh + gap;
        button(64 + col * (colW + gap), y, bw, bh, `${s.isOpen ? "Close" : "Open"} ${s.part.label}`, { type: "part", key: s.part.key }, { pressed: s.isOpen });
      });
      y += bh + 56;
    }
    if (p.finishes.length > 1) {
      label("Finish", y + 10);
      y += 34;
      p.finishes.forEach((f, i) => {
        const col = i % 2;
        if (i > 0 && col === 0) y += bh + gap;
        button(64 + col * (colW + gap), y, colW, bh, f.name, { type: "finish", index: i }, { pressed: ctx.finishIndex === i, swatch: swatches[i], color: f.swatchColor });
      });
      y += bh + 56;
    }
    label("Turn it", y + 10);
    y += 34;
    button(64, y, colW, bh, "↺  Left", { type: "turn", deg: 45 });
    button(64 + colW + gap, y, colW, bh, "Right  ↻", { type: "turn", deg: -45 });
    y += bh + 50;

    g.fillStyle = SLATE;
    g.font = `400 32px ${FONT}`;
    g.textBaseline = "alphabetic";
    const names = parts.map((s) => `the ${s.part.label}`).join(" or ");
    const hint = `To open ${names}, point at it and press the trigger, or look at it and pinch. ` +
      (p.placement === "wall" ? "Point at a wall to hang it there." : "Point at the floor to move it. Hold grip and sweep to turn it.");
    for (const line of wrapText(g, hint, W - 128)) { g.fillText(line, 64, y + 10); y += 44; }

    button(64, H - 64 - bh, W - 128, bh, "Exit", { type: "exit" });
    tex.needsUpdate = true;
  }
  draw();

  return {
    mesh,
    draw,
    buttonAt(uv) {
      if (!uv) return null;
      const x = uv.x * W, y = (1 - uv.y) * H;
      return buttons.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) || null;
    },
    setHover(b) {
      const id = b?.id || null;
      if (id === (hover?.id || null)) return;
      hover = b;
      draw();
    },
    press(b) { ctx.onAction(b.action); },
    buttonWorld(id) {
      const b = buttons.find((x) => x.id === id);
      if (!b) return null;
      const v = new THREE.Vector3(((b.x + b.w / 2) / W - 0.5) * W * M, (0.5 - (b.y + b.h / 2) / H) * H * M, 0);
      return mesh.localToWorld(v);
    },
  };
}
