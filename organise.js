// "Organise": a fridge model starts empty; the Fill button opens its doors and flies every item from a pile in front of
// it into its place on the shelves, in the door baskets and in the drawer. Press again and the items fly back out.
// The 3D file carries every item tagged `stock: true` (food.mjs); this module only moves those nodes, so it works for
// any product whose file has them. In AR (and in Apple's Quick Look and Android's Scene Viewer) the fridge is shown full.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function initOrganise({ mv, product, state, togglePart, bar, toast }) {
  const sceneSym = () => Object.getOwnPropertySymbols(mv).find((s) => s.description === "scene");
  let items = null, full = true, running = false, btn = null;

  function setup() {
    const scene = mv[sceneSym()];
    if (!scene || items) return;
    const found = [];
    scene.traverse((n) => { if (n.userData?.stock) found.push(n); });
    const set = new Set(found);
    items = found.filter((n) => { for (let p = n.parent; p; p = p.parent) if (set.has(p)) return false; return true; }).map((node) => ({
      node, pos: node.position.clone(), quat: node.quaternion.clone(), scale: node.scale.clone(),
    }));
    if (!items.length) { items = null; return; }
    items.forEach((it, i) => { it.r = [Math.sin(i * 12.9898) * 43758.5453 % 1, Math.sin(i * 78.233) * 43758.5453 % 1, Math.sin(i * 39.425) * 43758.5453 % 1].map((v) => Math.abs(v)); });
    scene.updateMatrixWorld?.(true);
    const B = scene.boundingBox?.constructor;
    const box = B ? new B().setFromObject(scene.target || scene) : null;
    items.forEach((it) => { it.v = it.node.getWorldPosition(it.node.position.clone()); });
    items.sort((a, b) => b.v.y - a.v.y || a.v.x - b.v.x);          // top shelf first
    items.box = box;
    makeButton();
    setFull(false);                                                  // the fridge starts empty
  }

  function pileFor(it, size, centre, min, max) {
    const V = it.pos.constructor;
    return new V(centre.x + (it.r[0] - 0.5) * size.x * 1.2, min.y + 0.03 + it.r[1] * size.y * 0.06, max.z + size.z * 0.35 + it.r[2] * size.z * 0.5);
  }

  function setFull(v) {
    full = v;
    for (const it of items) {
      it.node.visible = v;
      it.node.position.copy(it.pos); it.node.quaternion.copy(it.quat); it.node.scale.copy(it.scale);
    }
    mv[sceneSym()]?.queueRender?.();
    render();
  }

  function render() {
    if (!btn) return;
    btn.setAttribute("aria-pressed", String(full));
    btn.querySelector("span").textContent = full ? "Empty the fridge" : "Fill the fridge";
  }

  function makeButton() {
    btn = document.createElement("button");
    btn.id = "part-organise";
    btn.setAttribute("aria-pressed", "false");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/><path d="m17 15 2 2 3-4"/></svg><span></span>';
    btn.addEventListener("click", () => run(!full));
    bar.appendChild(btn);
    bar.classList.remove("hide");
    render();
  }

  // fly the items in (or back out); the doors open first so the fridge can be seen being filled
  async function run(toFull) {
    if (running || !items || toFull === full) return;
    running = true;
    if (toFull) {
      for (const p of product.parts) if (/door|freezer|fridge/i.test(p.label + p.key) && !/ice|tray/i.test(p.label) && !state[p.key]) { await togglePart(p.key); await sleep(1000); }
    }
    const scene = mv[sceneSym()];
    const box = items.box;
    const V = items[0].pos.constructor;
    const size = box ? box.getSize(new V()) : new V(0.6, 1.7, 0.7);
    const centre = box ? box.getCenter(new V()) : new V();
    const min = box ? box.min : new V(), max = box ? box.max : new V(0, 0, 0.35);
    items.forEach((it) => { it.start = pileFor(it, size, centre, min, max); it.node.visible = true; });
    const n = items.length, span = 1900, dur = 700, t0 = performance.now();
    const tmp = new V(), w = new V(), rest = new V();
    await new Promise((resolve) => {
      const frame = (now) => {
        let done = true;
        items.forEach((it, i) => {
          const d = (toFull ? i : n - 1 - i) * (span / n);
          let t = Math.min(1, Math.max(0, (now - t0 - d) / dur));
          if (t < 1) done = false;
          const e = ease(toFull ? t : 1 - t);                          // e = 1: in place, 0: on the pile
          const par = it.node.parent;
          par.updateWorldMatrix(true, false);
          rest.copy(it.pos); par.localToWorld(rest);
          w.lerpVectors(it.start, rest, e); w.y += Math.sin(Math.PI * e) * size.y * 0.12;
          tmp.copy(w); par.worldToLocal(tmp);
          it.node.position.copy(tmp);
          it.node.quaternion.slerpQuaternions(it.quat.clone().multiply(it.quat.clone().set(0, Math.sin(it.r[0] * 3), 0, Math.cos(it.r[0] * 3)).normalize()), it.quat, e);
          const s = 0.55 + 0.45 * e;
          it.node.scale.set(it.scale.x * s, it.scale.y * s, it.scale.z * s);
          it.node.visible = toFull ? t > 0 : t < 1;
        });
        scene?.queueRender?.();
        if (done) resolve(); else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    setFull(toFull);
    running = false;
  }

  // in AR the fridge is shown full
  mv.addEventListener("ar-status", (e) => { if (items && e.detail?.status === "session-started" && !full) setFull(true); });
  if (mv.loaded) setup(); else mv.addEventListener("load", setup, { once: true });
  return { fill: () => run(true), empty: () => run(false), isFull: () => full, ready: () => !!items };
}
