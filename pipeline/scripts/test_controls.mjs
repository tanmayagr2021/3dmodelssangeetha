// Tests the laptop controls of the product page with real input events: a trackpad swipe turns the model,
// a pinch (Ctrl + wheel) zooms toward the pointer, a mouse wheel zooms and then narrows the lens down to
// 4 degrees, zooming out comes back to the middle of the model, the view buttons and keys work, and a click
// on the empty background leaves the camera where it is.
// usage: node test_controls.mjs <baseUrl> <outDir> [product ids...]
import fs from "node:fs";
import { launch, sleep } from "./cdp.mjs";

const [base, out, ...args] = process.argv.slice(2);
const ids = args.length ? args : (await (await fetch(`${base}/products.json`)).json()).products.filter((p) => !p.hidden).map((p) => p.id);
fs.mkdirSync(out, { recursive: true });
let failed = 0;
const check = (ok, msg) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failed++; };
const b = await launch({ profile: `${out}/prof`, port: +(process.env.PORT || 9472) });
await b.viewport(1440, 900, false, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36");

const CAM = `(() => { const mv = document.querySelector('model-viewer'), o = mv.getCameraOrbit(), t = mv.getCameraTarget();
  return JSON.stringify({ theta: o.theta * 180 / Math.PI, phi: o.phi * 180 / Math.PI, r: o.radius, fov: mv.getFieldOfView(), t: [t.x, t.y, t.z] }); })()`;
const cam = async () => { await sleep(900); return JSON.parse(await b.evalJS(CAM)); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const sameTarget = (a, b) => a.t.every((v, i) => near(v, b.t[i], 0.005));
const key = async (k, code, vk) => {
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, text: k.length === 1 ? k : undefined });
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk });
  await sleep(100);
};

for (const id of ids) {
  console.log(`\n[${id}]`);
  b.logs.length = 0;
  await b.go(`${base}/p/${id}`);
  await b.waitFor("document.querySelector('model-viewer')?.loaded === true", 90000);
  await sleep(2500);
  const r = JSON.parse(await b.evalJS("JSON.stringify(document.querySelector('model-viewer').getBoundingClientRect())"));
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const wheel = (dx, dy, mods = 0, x = cx, y = cy) => b.send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: dx, deltaY: dy, modifiers: mods });
  const reset = async () => { await b.evalJS("document.getElementById('btnReset').click()"); await sleep(400); return cam(); };
  const home = await cam();

  for (let i = 0; i < 20; i++) { await wheel(-6.5, 0.5); await sleep(16); }
  let c = await cam();
  check(c.theta < home.theta - 20 && near(c.r, home.r, 0.01) && near(c.fov, home.fov, 0.1), `trackpad swipe turns (${home.theta.toFixed(0)} -> ${c.theta.toFixed(0)} degrees), no zoom`);

  await reset();
  for (let i = 0; i < 15; i++) { await wheel(0, -8, 2, cx - 60, cy); await sleep(16); }
  c = await cam();
  check(c.r < home.r * 0.8 && !sameTarget(c, home), `pinch zooms in toward the pointer (radius ${home.r.toFixed(2)} -> ${c.r.toFixed(2)} m)`);

  await reset();
  await sleep(400);
  for (let i = 0; i < 40; i++) { await wheel(0, -100); await sleep(30); }
  c = await cam();
  check(near(c.fov, 4, 0.05) && c.r < home.r, `mouse wheel zooms in, then narrows the lens to 4 degrees (${c.fov.toFixed(2)})`);
  await b.shot(`${out}/${id}-closeup.png`);
  for (let i = 0; i < 60; i++) { await wheel(0, 100); await sleep(20); }
  c = await cam();
  check(c.r > home.r && near(c.fov, home.fov, 0.1) && sameTarget(c, home), `zooming all the way out stops at a limit (${c.r.toFixed(2)} m) and is centred again`);

  // one click of a Mac mouse wheel (Chrome and Safari send exactly 4.000244140625) is one zoom step, not a turn
  await reset();
  await sleep(400);
  await wheel(0, -4.000244140625);
  c = await cam();
  check(c.r < home.r * 0.92 && near(c.theta, home.theta, 0.5) && near(c.phi, home.phi, 0.5), `a Mac mouse-wheel click zooms one step (${home.r.toFixed(2)} -> ${c.r.toFixed(2)} m), no turn`);

  await reset();
  const views = {};
  for (const v of ["front", "side", "back", "top"]) {
    await b.evalJS(`document.querySelector('.controls .view[data-view=${v}]').click()`);
    views[v] = await cam();
  }
  check(near(views.front.theta, 0, 1) && near(views.side.theta, -90, 1) && near(Math.abs(views.back.theta), 180, 1) && near(views.top.phi, 20, 1),
    "Front, Side, Back and Top buttons turn the view");

  await reset();
  await key("ArrowRight", "ArrowRight", 39);
  await key("ArrowRight", "ArrowRight", 39);
  await key("ArrowUp", "ArrowUp", 38);
  await key("+", "Equal", 187);
  c = await cam();
  check(near(c.theta, home.theta + 20, 1) && near(c.phi, home.phi - 10, 1) && c.r < home.r, "arrow keys turn and + zooms");
  await key("0", "Digit0", 48);
  c = await cam();
  check(near(c.theta, home.theta, 0.5) && near(c.r, home.r, 0.01), "0 puts the view back");

  // a click on the empty background used to zoom all the way out
  await b.send("Input.dispatchMouseEvent", { type: "mousePressed", x: r.x + 40, y: r.y + r.height - 40, button: "left", clickCount: 1 });
  await sleep(60);
  await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: r.x + 40, y: r.y + r.height - 40, button: "left", clickCount: 1 });
  c = await cam();
  check(near(c.r, home.r, 0.01) && sameTarget(c, home), "a click on the background leaves the camera where it is");

  // after a click in the side panel the arrow keys scroll it, and leave the model alone
  const a = JSON.parse(await b.evalJS("JSON.stringify(document.querySelector('aside').getBoundingClientRect())"));
  await b.send("Input.dispatchMouseEvent", { type: "mousePressed", x: a.x + 12, y: a.y + a.height / 2, button: "left", clickCount: 1 });
  await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: a.x + 12, y: a.y + a.height / 2, button: "left", clickCount: 1 });
  const top0 = await b.evalJS("document.querySelector('aside').scrollTop");
  await key("ArrowDown", "ArrowDown", 40);
  await key("ArrowDown", "ArrowDown", 40);
  c = await cam();
  const top1 = await b.evalJS("document.querySelector('aside').scrollTop");
  check(near(c.phi, home.phi, 0.5) && top1 > top0, `after a click in the side panel, arrows scroll it (${top0} -> ${top1} px) and the model stays`);

  const errors = b.logs.filter((l) => /EXC|error/i.test(l));
  check(errors.length === 0, `no console errors${errors.length ? ": " + errors.join(" | ") : ""}`);
}
console.log(`\n${failed} failed`);
b.close();
process.exit(failed ? 1 : 0);
