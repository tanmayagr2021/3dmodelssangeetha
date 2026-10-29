// Tests "Fill the fridge" (organise.js) on every product whose 3D file carries stock items.
// For each: the fridge starts empty; Fill puts every item exactly where it was built (no drift in position or scale),
// Empty hides them all again, a second Fill and a fill with the doors closed and reopened give the same result,
// and the page logs no errors.
// usage: node test_organise.mjs <base url> <out dir> [product ids...]
import fs from "node:fs";
import { launch, sleep } from "./cdp.mjs";

const [base, out, ...ids] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const products = (await (await fetch(`${base}/products.json`)).json()).products;
// hidden products have no page, so only the fridges on show are tested unless ids are given
const targets = ids.length ? ids : products.filter((p) => p.category === "Refrigerator" && !p.hidden).map((p) => p.id);
let failed = 0;
const check = (ok, msg) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failed++; };

const b = await launch({ profile: `${out}/prof`, port: +(process.env.PORT || 9470) });
await b.viewport(1400, 1000, false);

const snap = `(() => {
  const mv = document.querySelector('model-viewer');
  const sym = Object.getOwnPropertySymbols(mv).find((s) => s.description === 'scene');
  const scene = mv[sym];
  const found = [];
  scene.traverse((n) => { if (n.userData && n.userData.stock) found.push(n); });
  const set = new Set(found);
  const top = found.filter((n) => { for (let p = n.parent; p; p = p.parent) if (set.has(p)) return false; return true; });
  return top.map((n) => [n.visible ? 1 : 0, n.position.x, n.position.y, n.position.z, n.scale.x, n.scale.y, n.scale.z]);
})()`;
const maxDiff = (a, c) => a.reduce((m, r, i) => Math.max(m, ...[1, 2, 3, 4, 5, 6].map((k) => Math.abs(r[k] - c[i][k]))), 0);

for (const id of targets) {
  console.log(`\n[${id}]`);
  await b.go(`${base}/p/${id}`);
  await b.waitFor("document.querySelector('model-viewer')?.loaded === true", 60000);
  await sleep(2500);
  const ready = await b.evalJS("!!window.__organise?.ready?.()");
  check(ready, "the model has stock items and the Fill button is ready");
  if (!ready) continue;
  const empty = JSON.parse(await b.evalJS(`JSON.stringify(${snap})`));
  check(empty.length > 60, `${empty.length} stock items found`);
  check(empty.every((r) => r[0] === 0), "starts empty: every item hidden");
  check(await b.evalJS("document.getElementById('part-organise').textContent.includes('Fill')"), "the button says Fill the fridge");

  await b.evalJS("document.getElementById('part-organise').click()");
  await sleep(11000);
  const full1 = JSON.parse(await b.evalJS(`JSON.stringify(${snap})`));
  check(full1.every((r) => r[0] === 1), "after Fill: every item is visible");
  check(maxDiff(empty, full1) < 1e-5, `after Fill: every item is exactly in its place (max drift ${maxDiff(empty, full1).toExponential(1)} m)`);
  check(await b.evalJS("window.__organise.isFull() && document.getElementById('part-organise').textContent.includes('Empty')"), "the button now says Empty the fridge");
  const open = await b.evalJS("Object.values(window.__demo.state).filter(Boolean).length");
  check(open >= 2, `Fill opened the doors (${open} parts open)`);

  await b.evalJS("document.getElementById('part-organise').click()");
  await sleep(9000);
  const emptied = JSON.parse(await b.evalJS(`JSON.stringify(${snap})`));
  check(emptied.every((r) => r[0] === 0), "after Empty: every item hidden again");
  check(maxDiff(empty, emptied) < 1e-5, "after Empty: positions restored");

  await b.evalJS("document.getElementById('part-organise').click()");
  await sleep(11000);
  const full2 = JSON.parse(await b.evalJS(`JSON.stringify(${snap})`));
  check(full2.every((r) => r[0] === 1) && maxDiff(empty, full2) < 1e-5, "second Fill gives the same result");

  // close and reopen the doors while full: the stock stays put
  for (const p of ["freezer", "fridge"]) {
    await b.evalJS(`window.__demo.togglePart('${p}')`); await sleep(2200);
    await b.evalJS(`window.__demo.togglePart('${p}')`); await sleep(2200);
  }
  const full3 = JSON.parse(await b.evalJS(`JSON.stringify(${snap})`));
  check(full3.every((r) => r[0] === 1) && maxDiff(empty, full3) < 1e-5, "stock unchanged after closing and reopening the doors");
  await b.shot(`${out}/${id}-full.png`);
  const errs = b.logs.filter((l) => /EXCEPTION|\[error\]|Uncaught/.test(l));
  check(errs.length === 0, errs.length ? `console errors: ${errs.slice(0, 2).join(" | ")}` : "no console errors");
}
b.close();
console.log(`\n${failed} failed checks`);
process.exit(failed ? 1 : 0);
