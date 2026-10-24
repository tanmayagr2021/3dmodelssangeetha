// Checks the product page's newer features on every product (or ONLY=<id>):
// tapping each part where it is on screen opens that part, the feature hotspots and their
// tour, the "Will it fit?" check, and the WhatsApp link; then the phone layout.
// usage: node test_features.mjs <baseUrl> <outDir>
import fs from "node:fs";
import { launch, sleep } from "./cdp.mjs";

const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const report = [];
const log = (...a) => { const s = a.join(" "); report.push(s); console.log(s); };
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const products = (await (await fetch(`${base}/products.json`)).json()).products.filter((p) => !process.env.ONLY || p.id === process.env.ONLY);
const b = await launch({ profile: `${out}/prof`, port: +(process.env.PORT || 9455) });
let fails = 0;
const check = (ok, what) => { if (!ok) fails++; log(`  ${ok ? "ok  " : "FAIL"} ${what}`); };

// screen position of a model point, through a temporary hotspot
const screenOf = (p) => b.evalJS(`(async () => {
  const mv = document.querySelector("model-viewer");
  const pos = "${p.map((n) => `${n}m`).join(" ")}";
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  let el = mv.querySelector('[slot="hotspot-probe"]');
  // a new hotspot registers on the next mutation callback, so updateHotspot would miss it: create it in place
  if (!el) { el = document.createElement("div"); el.slot = "hotspot-probe"; el.className = "dot"; el.dataset.position = pos; el.dataset.normal = "0 0 1"; mv.appendChild(el); await frame(); }
  else mv.updateHotspot({ name: "hotspot-probe", position: pos });
  // model-viewer re-projects hotspots only when it renders, and an idle scene doesn't:
  // nudge the camera a hair and back to force fresh frames
  const o = mv.getCameraOrbit();
  mv.cameraOrbit = o.theta + 1e-4 + "rad " + o.phi + "rad " + o.radius + "m"; mv.jumpCameraToGoal(); await frame();
  mv.cameraOrbit = o.theta + "rad " + o.phi + "rad " + o.radius + "m"; mv.jumpCameraToGoal(); await frame(); await frame();
  const h = mv.queryHotspot("hotspot-probe"), r = mv.getBoundingClientRect();
  return h ? [r.left + h.canvasPosition.x, r.top + h.canvasPosition.y] : null;
})()`);
const tap = async (x, y) => {
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await b.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1, pointerType: "mouse" });
};
const state = async () => JSON.parse(await b.evalJS("JSON.stringify(window.__demo.state)"));

for (const p of products) {
  log(`\n[${p.id}]`);
  await b.viewport(1440, 900, false, MAC);
  await b.go(`${base}/p/${p.id}`);
  check(await b.waitFor("document.querySelector('model-viewer')?.loaded === true", 40000), "model loaded");
  await sleep(1800);

  // tap each part in the middle of its front face, from the front
  await b.evalJS(`(() => { const mv = document.querySelector("model-viewer"); mv.cameraOrbit = "0deg 82deg auto"; mv.jumpCameraToGoal(); })()`);
  await sleep(700);
  for (const part of p.parts || []) {
    if (!part.zone) { check(false, `${part.key}: no zone`); continue; }
    if (part.needs) { // lives behind another part: it cannot be tapped while closed, but opening it opens the outer part too
      const was = await state();
      await b.evalJS(`window.__demo.togglePart("${part.key}")`); await sleep(2800);
      const now = await state();
      check(now[part.key] && now[part.needs], `${part.key} opens ${part.needs} first (${JSON.stringify(now)})`);
      await b.evalJS(`window.__demo.togglePart("${part.needs}")`); await sleep(2800);
      const closed = await state();
      check(!closed[part.key] && !closed[part.needs], `closing ${part.needs} closes ${part.key} first (${JSON.stringify(closed)})`);
      void was;
      continue;
    }
    const [a, z] = part.zone.closed;
    // a flat part such as a top-loader's lid is tapped on its top surface; anything else on the middle of its front face
    const flat = z[1] - a[1] < 0.12 && z[2] - a[2] > 0.2;
    const front = flat ? [(a[0] + z[0]) / 2, z[1], (a[2] + z[2]) / 2] : [(a[0] + z[0]) / 2, (a[1] + z[1]) / 2, z[2]];
    const before = await state();
    const others = Object.keys(before).filter((k) => k !== part.key && before[k]);
    if (others.length) { log(`  (skip tap on ${part.key}: ${others} open)`); continue; }
    const pt = await screenOf(front);
    if (!pt) { check(false, `${part.key}: no screen point`); continue; }
    await tap(pt[0], pt[1]);
    await sleep(1100);
    const after = await state();
    const changed = Object.keys(after).filter((k) => after[k] !== before[k]);
    check(changed.length === 1 && changed[0] === part.key, `tap on ${part.key} at ${pt.map(Math.round)} toggles ${changed.join(",") || "nothing"}`);
    if (after[part.key]) { await b.evalJS(`window.__demo.togglePart("${part.key}")`); await sleep(1100); }
  }

  // hotspots: the visible ones match the door state; the tour opens what each needs
  const hs = p.hotspots || [];
  check(hs.length >= 3 && hs.length <= 4, `${hs.length} hotspots`);
  const shown = await b.evalJS(`[...document.querySelectorAll(".hs")].map((e) => !e.classList.contains("off"))`);
  check(JSON.stringify(shown) === JSON.stringify(hs.map((h) => !h.show || h.show === "always" || h.show.startsWith("!"))), `closed-state hotspots ${shown}`);
  for (let i = 0; i < hs.length; i++) {
    await b.evalJS(`window.__demo.showFeature(${i}, { tour: true })`);
    await sleep(1900);
    const st = await state();
    const need = hs[i].show && hs[i].show !== "always" ? hs[i].show : null;
    const okState = !need || (need.startsWith("!") ? !st[need.slice(1)] : st[need]);
    const card = await b.evalJS(`[document.getElementById("fcTitle").textContent, !document.getElementById("fcard").classList.contains("gone"), !document.querySelectorAll(".hs")[${i}].classList.contains("off")]`);
    check(okState && card[0] === hs[i].title && card[1] && card[2], `feature ${i + 1} "${hs[i].title}" (${hs[i].show}) card shown, dot shown, state ${JSON.stringify(st)}`);
    await b.shot(`${out}/${p.id}-feature${i + 1}.png`);
  }
  await b.evalJS(`window.__demo.closeFeature()`);
  for (const [k, v] of Object.entries(await state())) if (v) { await b.evalJS(`window.__demo.togglePart("${k}")`); await sleep(1100); }

  // will it fit: one space that fits, one that doesn't
  const w = parseFloat(p.size.w), h = parseFloat(p.size.h), d = parseFloat(p.size.d), f = p.fit || {};
  const set = (vals) => b.evalJS(`(() => { for (const [k, v] of Object.entries(${JSON.stringify(vals)})) { const el = document.getElementById("fit-" + k); if (el) { el.value = v; } } document.getElementById("fitIn").dispatchEvent(new Event("input", { bubbles: true })); })()`);
  const roomy = { w: w + 2 * (f.sides || 0) + 4, h: h + (f.top || 0) + 6, d: d + (f.back || 0) + 3 };
  await set(roomy);
  await sleep(1400);
  const yes = await b.evalJS(`[document.getElementById("fitOut").className, document.querySelector("#fitOut .verdict")?.textContent, !document.getElementById("fitLines").classList.contains("hide")]`);
  check(/yes/.test(yes[0]) && /fits/.test(yes[1]) && yes[2], `fit roomy ${JSON.stringify(roomy)} -> "${yes[1]}", box drawn ${yes[2]}`);
  await b.shot(`${out}/${p.id}-fit-yes.png`);
  await set({ ...roomy, w: w - 2 });
  await sleep(900);
  const no = await b.evalJS(`[document.getElementById("fitOut").className, document.querySelector("#fitOut .verdict")?.textContent]`);
  check(/no/.test(no[0]) && /too wide/.test(no[1]), `fit narrow -> "${no[1]}"`);
  await b.shot(`${out}/${p.id}-fit-no.png`);
  await set({ w: "", h: "", d: "" });
  await sleep(500);

  const wa = await b.evalJS(`document.getElementById("btnWhatsApp").href`);
  check(wa.startsWith("https://wa.me/?text=") && decodeURIComponent(wa).includes(`/p/${p.id}`), `WhatsApp link ${wa.slice(0, 60)}…`);

  // phone
  await b.viewport(390, 844, true, IPHONE);
  await b.go(`${base}/p/${p.id}`);
  await b.waitFor("document.querySelector('model-viewer')?.loaded === true", 40000);
  await sleep(1500);
  check(!(await b.evalJS("document.documentElement.scrollWidth > innerWidth")), "phone: no horizontal overflow");
  const partsBox = await b.evalJS(`(() => { const r = document.getElementById("parts").getBoundingClientRect(); return [r.left, r.right]; })()`);
  check(partsBox[0] >= 0 && partsBox[1] <= 390, `phone: part chips inside the screen ${partsBox.map(Math.round)}`);
  await b.evalJS(`window.__demo.showFeature(0, { tour: true })`);
  await sleep(1800);
  await b.shot(`${out}/${p.id}-phone-feature.png`);
}
const errs = b.logs.filter((l) => /EXCEPTION|LOG |\[error\]/.test(l));
log("\nerrors:", errs.length ? "\n" + errs.join("\n") : "none");
log(`\n${fails} failed checks`);
fs.writeFileSync(`${out}/report.txt`, report.join("\n"));
b.close();
