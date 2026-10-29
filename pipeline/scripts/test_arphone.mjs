// Phone AR on Android, driven through the stand-in in xr_phone.js (not a real phone, not ARCore).
// What the shop needs: staff point the dot at a spot on the floor, Place here stands the product on
// exactly that spot, facing the phone, at real size; a finger dragging across it can't slide it away;
// Move to another spot puts it somewhere else, a tap on the camera view places it too; leaving AR gives
// the 3D view back. Wall units keep model-viewer's own placement on the wall.
// usage: node test_arphone.mjs <baseUrl> <outDir> [product ids...]
import fs from "node:fs";
import { launch, sleep } from "./cdp.mjs";

const [base, out, ...args] = process.argv.slice(2);
const ids = args.length ? args : (await (await fetch(`${base}/products.json`)).json()).products.filter((p) => !p.hidden).map((p) => p.id);
fs.mkdirSync(out, { recursive: true });
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
let failed = 0;
const check = (ok, msg) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failed++; };
const b = await launch({ profile: `${out}/prof`, port: +(process.env.PORT || 9481) });
await b.viewport(412, 915, true, ANDROID);
await b.send("Page.addScriptToEvaluateOnNewDocument", { source: fs.readFileSync(new URL("./xr_phone.js", import.meta.url), "utf8") });

// where the product stands: the middle of its footprint, at the bottom of its box, in the AR world
const STAND = `(() => {
  const mv = document.querySelector('model-viewer');
  const sym = (o, n) => { for (; o; o = Object.getPrototypeOf(o)) { const s = Object.getOwnPropertySymbols(o).find((x) => x.description === n); if (s) return s; } };
  const scene = mv[sym(mv, 'scene')], R = mv[sym(mv, 'renderer')].arRenderer, bb = scene.boundingBox;
  scene.updateMatrixWorld(true);
  const c = bb.getCenter(scene.pivot.position.clone()); c.y = bb.min.y;
  const w = scene.target.localToWorld(c);
  const yaw = scene.pivot.rotation.y;
  return JSON.stringify({ at: [w.x, w.y, w.z], goal: [R.goalPosition.x, R.goalPosition.y, R.goalPosition.z], yaw, scale: scene.pivot.scale.x,
    shown: scene.model.visible, mode: mv.getAttribute('ar-status'), ui: document.getElementById('arUi').className,
    place: document.getElementById('arPlace').disabled ? 'disabled' : 'enabled', status: document.getElementById('arStatus').textContent,
    phone: window.__phone.state.pos });
})()`;
const stand = async (ms = 900) => { await sleep(ms); return JSON.parse(await b.evalJS(STAND)); };
const dist = (a, c) => Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]);
const fmt = (p) => `(${p.map((v) => v.toFixed(3)).join(", ")})`;
const aim = (from, to) => b.evalJS(`window.__phone.aim(${JSON.stringify(from)}, ${JSON.stringify(to)})`);
const facing = (s) => { const want = Math.atan2(s.phone[0] - s.at[0], s.phone[2] - s.at[2]); let d = s.yaw - want; d = Math.atan2(Math.sin(d), Math.cos(d)); return Math.abs(d) * 180 / Math.PI; };

for (const id of ids) {
  console.log(`\n[${id}]`);
  b.logs.length = 0;
  await b.go(`${base}/p/${id}`);
  await b.waitFor("document.querySelector('model-viewer')?.loaded === true", 90000);
  await sleep(1500);
  const info = JSON.parse(await b.evalJS(`JSON.stringify({ wall: window.__demo.product.placement === 'wall', can: document.querySelector('model-viewer').canActivateAR,
    dims: (() => { const d = document.querySelector('model-viewer').getDimensions(); return [d.x, d.y, d.z]; })() })`));
  check(info.can, "Android Chrome with WebXR gets the in-browser AR view");
  // zoom the 3D view onto one spot first: AR must still stand it by its middle
  await b.evalJS("(() => { const mv = document.querySelector('model-viewer'), d = mv.getDimensions(), c = mv.getBoundingBoxCenter(); mv.cameraTarget = `${c.x + d.x * 0.4}m ${c.y + d.y * 0.3}m ${c.z + d.z / 2}m`; mv.jumpCameraToGoal(); })()");
  await sleep(400);

  const F = await b.evalJS("window.__phone.floor");
  const eye = [0, 0, 0];
  await b.evalJS("window.__phone.state.floorFound = false");
  await aim(eye, [0.3, F, -1.6]);
  await b.evalJS("document.getElementById('btnAR').click()");
  await sleep(500);
  if (await b.evalJS("!document.getElementById('sheet').classList.contains('hide')")) await b.evalJS("document.getElementById('sheetGo').click()");
  const started = await b.waitFor("document.querySelector('model-viewer').getAttribute('ar-status') === 'session-started'", 10000);
  check(started, "AR starts");
  if (!started) continue;

  if (info.wall) {
    let s = await stand(800);
    check(!/aiming|placed/.test(s.ui) && /wall/.test(s.status), `a wall unit keeps the wall placement ("${s.status}")`);
    await b.evalJS("window.__phone.state.floorFound = true");
    await b.evalJS("window.__phone.state.session.end()");
    await b.waitFor("document.querySelector('model-viewer').getAttribute('ar-status') === 'not-presenting'", 5000);
  } else {
    let s = await stand(800);
    check(/aiming/.test(s.ui) && !s.shown && s.place === "disabled" && /Point the dot/.test(s.status),
      `before the floor is found: only the dot, Place here greyed out ("${s.status.replace(/\n/g, " / ")}")`);

    await b.evalJS("window.__phone.state.floorFound = true");
    const A = await b.evalJS("window.__phone.centreHit()");
    s = await stand(1200);
    check(s.place === "enabled" && !s.shown && dist(s.goal, A) < 0.002 && /real size on the floor/.test(s.status),
      `the floor is found: its footprint goes where the dot points ${fmt(A)}, Place here lights up`);

    // walk a little and point somewhere else; the footprint follows the dot
    await aim([0.2, 0.05, 0.3], [-0.45, F, -1.9]);
    const B = await b.evalJS("window.__phone.centreHit()");
    s = await stand(1500);
    await b.shot(`${out}/${id}-aiming.png`);
    check(dist(s.goal, B) < 0.002 && dist(s.at, B) < 0.03, `pointing somewhere else moves the footprint there (${fmt(s.at)})`);

    await b.evalJS("document.getElementById('arPlace').click()");
    s = await stand(300);
    check(s.shown && dist(s.at, B) < 0.001, `Place here stands it on exactly that spot: ${fmt(s.at)} vs ${fmt(B)} (${(dist(s.at, B) * 1000).toFixed(1)} mm)`);
    check(facing(s) < 1, `its front faces the phone (${facing(s).toFixed(1)} degrees off)`);
    check(s.scale === 1, `real size: scale ${s.scale}, ${info.dims.map((v) => (v * 100).toFixed(1)).join(" x ")} cm`);
    check(/placed/.test(s.ui) && /stays on this spot/.test(s.status), `it says so ("${s.status.replace(/\n/g, " / ")}")`);
    await b.shot(`${out}/${id}-placed.png`);

    // the phone moves (customer walks around it) and a finger drags across it: it stays
    await aim([1.1, 0.1, -0.9], [-0.45, F + 0.5, -1.9]);
    const scr = JSON.parse(await b.evalJS(`JSON.stringify(window.__phone.project(${JSON.stringify(B)}))`));
    await b.evalJS(`window.__phone.touchStart(${scr[0]}, ${scr[1]})`);
    for (let i = 1; i <= 12; i++) { await b.evalJS(`window.__phone.touchMove(${scr[0] + i * 0.04}, ${scr[1] + i * 0.02})`); await sleep(40); }
    await b.evalJS("window.__phone.touchEnd()");
    for (let k = 0; k < 5; k++) { await b.evalJS(`window.__phone.touchStart(${scr[0]}, ${scr[1]})`); await sleep(60); await b.evalJS("window.__phone.touchEnd()"); await sleep(60); }
    s = await stand(1200);
    check(dist(s.at, B) < 0.0005, `walking round it and dragging a finger across it leaves it where it is (${(dist(s.at, B) * 1000).toFixed(2)} mm)`);
    // a swipe across the empty floor used to spin it
    const yaw0 = s.yaw;
    await b.evalJS("window.__phone.touchStart(-0.8, 0.85)");
    for (let i = 1; i <= 14; i++) { await b.evalJS(`window.__phone.touchMove(${-0.8 + i * 0.1}, 0.85)`); await sleep(40); }
    await b.evalJS("window.__phone.touchEnd()");
    s = await stand(1200);
    check(Math.abs(s.yaw - yaw0) < 1e-4 && dist(s.at, B) < 0.0005, `a one-finger swipe across the screen doesn't spin it (${((s.yaw - yaw0) * 180 / Math.PI).toFixed(2)} degrees)`);

    // Move to another spot, then a tap on the camera view places it
    await b.evalJS("document.getElementById('arMove').click()");
    s = await stand(300);
    check(/aiming/.test(s.ui) && !s.shown, "Move to another spot: back to the dot and the footprint");
    await aim([1.1, 0.1, -0.9], [1.4, F, -2.6]);
    const C = await b.evalJS("window.__phone.centreHit()");
    await sleep(1200);
    await b.click(206, 430);
    s = await stand(400);
    check(s.shown && dist(s.at, C) < 0.001 && facing(s) < 1, `a tap on the camera view places it on the new spot (${(dist(s.at, C) * 1000).toFixed(1)} mm off, facing the phone)`);

    await b.evalJS("document.querySelector('model-viewer').shadowRoot.querySelector('.slot.exit-webxr-ar-button').click()");
    const left = await b.waitFor("document.querySelector('model-viewer').getAttribute('ar-status') === 'not-presenting'", 5000);
    s = await stand(800);
    check(left && s.shown && !/aiming|placed/.test(s.ui), "leaving AR gives the 3D view back with the product showing");

    // a second visit starts again from the dot
    await aim(eye, [0, F, -1.5]);
    await b.evalJS("document.getElementById('btnAR').click()");
    await sleep(500);
    if (await b.evalJS("!document.getElementById('sheet').classList.contains('hide')")) await b.evalJS("document.getElementById('sheetGo').click()");
    await b.waitFor("document.querySelector('model-viewer').getAttribute('ar-status') === 'session-started'", 10000);
    const D = await b.evalJS("window.__phone.centreHit()");
    s = await stand(1200);
    check(/aiming/.test(s.ui) && !s.shown && dist(s.goal, D) < 0.002, "opening AR again starts from the dot");
    await b.evalJS("document.getElementById('arPlace').click()");
    s = await stand(300);
    check(s.shown && dist(s.at, D) < 0.001, "and places on the spot again");
    await b.evalJS("window.__phone.state.session.end()");
    await b.waitFor("document.querySelector('model-viewer').getAttribute('ar-status') === 'not-presenting'", 5000);
  }
  const errors = b.logs.filter((l) => /EXC|error/i.test(l));
  check(errors.length === 0, `no console errors${errors.length ? ": " + errors.join(" | ") : ""}`);
}
console.log(`\n${failed} failed`);
b.close();
process.exit(failed ? 1 : 0);
