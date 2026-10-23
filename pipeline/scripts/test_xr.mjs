// Drives the headset mode in Meta's WebXR emulator (IWER, emulating a Quest 3):
// enter AR from the page, aim the right controller at a door and press the trigger,
// pick a finish and Exit on the floating panel, move the product, then check that the
// page picked up the headset's state. Then the same for the VR showroom.
import fs from "node:fs";
import { launch, sleep } from "./cdp.mjs";

const [base, out, iwerPath, productId = "godrej-rt-eonvogue-280c"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const QUEST_UA = "Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/35.2.0.4.53 SamsungBrowser/4.0 Chrome/128.0.6613.137 VR Safari/537.36";
const report = [];
const log = (...a) => { const s = a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "); report.push(s); console.log(s); };

const b = await launch({ profile: `${out}/prof`, port: +(process.env.PORT || 9453) });
await b.viewport(1280, 800, false, QUEST_UA);
await b.send("Page.addScriptToEvaluateOnNewDocument", { source: fs.readFileSync(iwerPath, "utf8") + `
;window.__dev = new IWER.XRDevice(IWER.metaQuest3, { stereoEnabled: false });
window.__dev.installRuntime({ forceInstall: true });` });

// aim a controller (or the head) at a world point; the ray points down -Z
const aim = (who, from, to) => b.evalJS(`(() => {
  const d = window.__dev, c = ${who === "head" ? "d" : `d.controllers.${who}`};
  const f = ${JSON.stringify(from)}, t = ${JSON.stringify(to)};
  let x = t[0]-f[0], y = t[1]-f[1], z = t[2]-f[2]; const l = Math.hypot(x,y,z); x/=l; y/=l; z/=l;
  // quaternion turning (0,0,-1) onto (x,y,z)
  const ax = y, ay = -x, az = 0, w = 1 - z; const n = Math.hypot(ax, ay, az, w);
  c.position.set(f[0], f[1], f[2]);
  if (n < 1e-6) c.quaternion.set(0, 1, 0, 0); else c.quaternion.set(ax/n, ay/n, az/n, w/n);
  return true; })()`);
const trigger = async (who = "right") => {
  await b.evalJS(`window.__dev.controllers.${who}.updateButtonValue('trigger', 1)`); await sleep(250);
  await b.evalJS(`window.__dev.controllers.${who}.updateButtonValue('trigger', 0)`); await sleep(300);
};
const info = () => b.evalJS("window.__xrDebug && window.__xrDebug.info()");
const showCanvas = () => b.evalJS(`(() => { const c = document.querySelector('canvas[data-engine]'); if (c) c.style.display = '';
  const box = document.querySelector('[data-webxr_runtime]'); if (box) box.style.background = 'linear-gradient(#9aa0a6, #6f6a63)'; return !!c; })()`);
const hand = [0.18, 1.25, -0.25];

async function enter(button, label) {
  const r = await b.evalJS(`(() => { const r = document.getElementById('${button}').getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; })()`);
  await b.evalJS(`document.getElementById('${button}').scrollIntoView({block:'center'})`);
  await sleep(300);
  const r2 = await b.evalJS(`(() => { const r = document.getElementById('${button}').getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; })()`);
  await b.click(r2[0], r2[1]);
  // the AR button shows the guide first; its Open button starts the session
  if (await b.waitFor("!!document.getElementById('sheetGo') && !document.getElementById('sheet').classList.contains('hide')", 3000)) {
    await sleep(400);
    log(`${label} guide:`, await b.evalJS("document.getElementById('sheetTitle').textContent"), "|", await b.evalJS("[...document.querySelectorAll('.g-row b')].map(x=>x.textContent).join(', ')"));
    await b.shot(`${out}/${label}-guide.png`);
    const g = await b.evalJS("(() => { const r = document.getElementById('sheetGo').getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; })()");
    await b.click(g[0], g[1]);
  }
  const ok = await b.waitFor("!!window.__xrDebug", 20000);
  await sleep(1500);
  log(`${label}: entered=${ok}`, await info());
  await showCanvas();
  await sleep(500);
  return ok;
}

await b.go(`${base}/p/${productId}`);
await b.waitFor("document.querySelector('model-viewer')?.loaded === true", 40000);
await sleep(1000);
log("caps:", await b.evalJS("window.__demo.caps"), "VR button visible:", await b.evalJS("!document.getElementById('btnVR').classList.contains('hide')"));
log("note:", await b.evalJS("document.getElementById('arNote').textContent"));
await b.shot(`${out}/0-page.png`);

// ── AR ──
if (await enter("btnAR", "AR")) {
  await b.evalJS("window.__dev.position.set(0, 1.6, 0); window.__dev.quaternion.set(0, 0, 0, 1)");
  await aim("left", [-0.3, 1.1, -0.2], [-0.6, 0, -0.5]);
  await sleep(800);
  await b.shot(`${out}/1-ar-start.png`);
  const parts = await b.evalJS("window.__demo.product.parts.map(p => p.key)");
  let i = 2;
  for (const key of parts) {
    const target = await b.evalJS(`window.__xrDebug.partWorld('${key}')`);
    const front = [target[0], target[1], target[2] + 0.01]; // the part's own centre: the ray meets its front face first
    await aim("right", hand, front);
    await sleep(400);
    const hov = (await info()).hovers;
    log(`aim at ${key}:`, hov);
    await trigger();
    await sleep(1200);
    log(`after trigger on ${key}:`, (await info()).parts);
    await b.shot(`${out}/${i++}-ar-${key}-open.png`);
  }
  const fins = await b.evalJS("window.__demo.product.finishes.length");
  if (fins > 1) {
    const btn = await b.evalJS("window.__xrDebug.buttonWorld('finish:1')");
    await aim("right", hand, btn);
    await sleep(400);
    log("aim at finish 1:", (await info()).hovers);
    await trigger();
    await sleep(800);
    log("after finish press:", (await info()).finishIndex);
    await b.shot(`${out}/${i++}-ar-finish.png`);
  }
  // move it: point at the floor to the left
  const before = (await info()).holder;
  await aim("right", hand, [-0.9, 0, -1.4]);
  await sleep(400);
  log("aim at floor:", (await info()).hovers);
  await b.shot(`${out}/${i++}-ar-reticle.png`);
  await trigger();
  await sleep(500);
  log("moved:", before, "->", (await info()).holder);
  // turn it with the panel
  const yaw0 = (await info()).yaw;
  const turnBtn = await b.evalJS("window.__xrDebug.buttonWorld('turn:45')");
  await aim("right", hand, turnBtn);
  await sleep(400);
  await trigger();
  log("turn left: yaw", yaw0.toFixed(3), "->", (await info()).yaw.toFixed(3));
  await b.shot(`${out}/${i++}-ar-moved.png`);
  // exit from the panel
  const exit = await b.evalJS("window.__xrDebug.buttonWorld('exit:')");
  await aim("right", hand, exit);
  await sleep(400);
  log("aim at exit:", (await info()).hovers);
  await trigger();
  await sleep(1500);
  log("after exit: xr active =", await b.evalJS("!!window.__xrDebug"), "page state:", await b.evalJS("window.__demo.state"), "variant:", await b.evalJS("document.querySelector('model-viewer').variantName"));
  await b.shot(`${out}/${i++}-page-after.png`);
}

// ── VR showroom ──
if (await b.evalJS("!document.getElementById('btnVR').classList.contains('hide')")) {
  if (await enter("btnVR", "VR")) {
    await b.evalJS("window.__dev.position.set(0, 1.6, 0); window.__dev.quaternion.set(0, 0, 0, 1)");
    await sleep(800);
    await b.shot(`${out}/v1-vr-start.png`);
    // look down-right a little so the panel is in view
    await b.evalJS("window.__dev.quaternion.set(-0.13, -0.1, -0.013, 0.986)");
    await sleep(600);
    await b.shot(`${out}/v2-vr-panel.png`);
    await b.evalJS("window.__dev.quaternion.set(0, 0, 0, 1)");
    const key = await b.evalJS("window.__demo.product.parts[0].key");
    const target = await b.evalJS(`window.__xrDebug.partWorld('${key}')`);
    await aim("right", hand, [target[0], target[1], target[2] + 0.01]);
    await sleep(300);
    await trigger();
    await sleep(1200);
    log(`VR after trigger on ${key}:`, (await info()).parts);
    await b.shot(`${out}/v3-vr-${key}.png`);
    await b.evalJS("navigator.xr && window.__dev.activeSession && window.__dev.activeSession.end()");
    await sleep(1000);
    log("VR exit: page state", await b.evalJS("window.__demo.state"));
  }
}

const errs = b.logs.filter((l) => /EXCEPTION|LOG |\[error\]/.test(l));
log("errors:", errs.length ? "\n" + errs.join("\n") : "none");
fs.writeFileSync(`${out}/report.txt`, report.join("\n"));
b.close();
