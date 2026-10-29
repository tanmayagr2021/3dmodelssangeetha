// Tests the embed mode (/p/<id>?embed) two ways:
// 1. on its own: header and side panel hidden, the viewer fills the window, "View in your room" links to the full page
//    without ?embed, doors and Fill still work, no console errors;
// 2. inside an iframe on another origin (a mock retailer page): it loads, Fill works from inside the frame,
//    and the AR link opens the full page in a new tab.
// usage: node test_embed.mjs <site base url> <host page url> <out dir> [product id]
import fs from "node:fs";
import { launch, sleep } from "./cdp.mjs";

const [base, host, out, id = "lg-glt3426snpz"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
let failed = 0;
const check = (ok, msg) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failed++; };
const b = await launch({ profile: `${out}/prof`, port: +(process.env.PORT || 9471) });

console.log(`\n[${id}?embed on its own]`);
for (const [w, h, mobile] of [[900, 640, false], [390, 480, true]]) {
  await b.viewport(w, h, mobile);
  await b.go(`${base}/p/${id}?embed`);
  await b.waitFor("document.querySelector('model-viewer')?.loaded === true", 60000);
  await sleep(2500);
  const r = JSON.parse(await b.evalJS(`JSON.stringify({
    embed: document.documentElement.classList.contains('embed'),
    header: getComputedStyle(document.querySelector('header')).display,
    aside: getComputedStyle(document.querySelector('aside')).display,
    stage: document.getElementById('stage').getBoundingClientRect().height,
    open: getComputedStyle(document.getElementById('embedOpen')).display,
    href: document.getElementById('embedOpen').href,
    target: document.getElementById('embedOpen').target,
    scroll: document.documentElement.scrollHeight - innerHeight })`));
  check(r.embed && r.header === "none" && r.aside === "none", `${w}×${h}: header and side panel hidden`);
  check(Math.abs(r.stage - h) < 2 && r.scroll <= 1, `${w}×${h}: viewer fills the window (${r.stage} px), no scrolling`);
  check(r.open !== "none" && r.target === "_blank" && r.href.endsWith(`/p/${id}`), `${w}×${h}: "View in your room" opens ${r.href} in a new tab`);
  await b.shot(`${out}/embed-${w}x${h}.png`);
}
await b.viewport(900, 640, false);
await b.go(`${base}/p/${id}?embed`);
await b.waitFor("document.querySelector('model-viewer')?.loaded === true", 60000);
await sleep(2500);
await b.evalJS("document.getElementById('part-organise')?.click()");
await sleep(12000);
check(await b.evalJS("window.__organise?.isFull() === true"), "Fill the fridge works in embed mode");
check(await b.evalJS("Object.values(window.__demo.state).filter(Boolean).length >= 2"), "doors opened in embed mode");
check(await b.evalJS("!/embed/.test(document.querySelector('#btnWhatsApp').href)"), "shared links drop ?embed");
await b.shot(`${out}/embed-full.png`);

console.log(`\n[inside an iframe on ${host}]`);
const opened = [];
for (const ev of ["Target.targetCreated", "Target.targetInfoChanged"]) b.on(ev, (p) => { if (p.targetInfo.type === "page" && p.targetInfo.url) opened.push(p.targetInfo.url); });
await b.send("Target.setDiscoverTargets", { discover: true });
await b.viewport(1366, 900, false);
await b.go(host);
await sleep(1500);
const tree = await b.send("Page.getFrameTree");
const child = tree.result.frameTree.childFrames?.[0]?.frame;
check(!!child && child.url.includes(`/p/${id}?embed`) && new URL(child.url).origin !== new URL(host).origin, `the frame is on another origin (${child?.url})`);
const world = await b.send("Page.createIsolatedWorld", { frameId: child.id, worldName: "t" });
const ctx = world.result.executionContextId;
const inFrame = async (expr) => (await b.send("Runtime.evaluate", { expression: expr, contextId: ctx, returnByValue: true, userGesture: true })).result?.result?.value;
let ready = false;
for (let t = 0; t < 60 && !ready; t++) { ready = await inFrame("!!document.getElementById('part-organise')"); if (!ready) await sleep(1000); }
check(ready, "the 3D model loads inside the frame (Fill button appeared)");
check(await inFrame("document.documentElement.classList.contains('embed')"), "embed layout inside the frame");
await sleep(1500);
await b.shot(`${out}/host-closed.png`);
await inFrame("document.getElementById('part-organise').click()");
await sleep(12000);
check(await inFrame("document.getElementById('part-organise').textContent.includes('Empty')"), "Fill works from inside the frame");
await b.shot(`${out}/host-full.png`);
await inFrame("document.getElementById('embedOpen').click()");
await sleep(2500);
const tabs = [...new Set(opened)].filter((u) => !u.startsWith(host));
check(tabs.some((u) => u.endsWith(`/p/${id}`)), `tapping "View in your room" opened the full page in a new tab (${tabs.join(", ") || "nothing"})`);
const errs = b.logs.filter((l) => /EXCEPTION|Uncaught/.test(l));
check(errs.length === 0, errs.length ? `errors: ${errs.slice(0, 2).join(" | ")}` : "no page errors");
b.close();
console.log(`\n${failed} failed checks`);
process.exit(failed ? 1 : 0);
