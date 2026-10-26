// Checks the catalogue and every product page on desktop and phone sizes.
// Also fakes an iPhone's Quick Look support to check which file the AR button opens.
import fs from "node:fs";
import { launch, sleep } from "./cdp.mjs";

const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const report = [];
const log = (...a) => { const s = a.join(" "); report.push(s); console.log(s); };
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
// ONLY=<id> checks one product page; PORT picks the browser's debugging port
const ids = (await (await fetch(`${base}/products.json`)).json()).products.filter((p) => !p.hidden).map((p) => p.id).filter((id) => !process.env.ONLY || id === process.env.ONLY);

const b = await launch({ profile: `${out}/prof`, port: +(process.env.PORT || 9452) });

// ── catalogue ──
await b.viewport(1440, 900);
await b.go(`${base}/`);
await b.waitFor("document.querySelectorAll('.card').length > 0");
await sleep(800);
await b.shot(`${out}/cat-desktop.png`);
log("catalogue cards:", await b.evalJS("document.querySelectorAll('.card').length"));
await b.evalJS("(()=>{const q=document.getElementById('q'); q.value='fhp1412'; q.dispatchEvent(new Event('input'));})()");
await sleep(300);
log("search fhp1412 ->", await b.evalJS("[...document.querySelectorAll('.card h2')].map(h=>h.textContent).join(' | ')"), "| mark:", await b.evalJS("document.querySelector('.card mark')?.textContent"));
await b.evalJS("(()=>{const q=document.getElementById('q'); q.value='RT34HG5'; q.dispatchEvent(new Event('input'));})()");
await sleep(200);
log("search 'RT34HG5' ->", await b.evalJS("[...document.querySelectorAll('.card h2')].map(h=>h.textContent).join(' | ')"));
await b.evalJS("(()=>{const q=document.getElementById('q'); q.value='xyz123'; q.dispatchEvent(new Event('input'));})()");
await sleep(200);
log("search 'xyz123' ->", await b.evalJS("document.querySelector('.empty')?.textContent"));
await b.evalJS("(()=>{const q=document.getElementById('q'); q.value=''; q.dispatchEvent(new Event('input')); [...document.querySelectorAll('.chip')].find(c=>c.textContent.startsWith('Air conditioners')).click();})()");
await sleep(200);
log("chip AC ->", await b.evalJS("[...document.querySelectorAll('.card h2')].map(h=>h.textContent).join(' | ')"));
await b.viewport(390, 844, true, IPHONE);
await b.go(`${base}/`);
await b.waitFor("document.querySelectorAll('.card').length > 0");
await sleep(800);
await b.shot(`${out}/cat-mobile.png`);
log("mobile catalogue horizontal overflow:", await b.evalJS("document.documentElement.scrollWidth > innerWidth"));

// ── product pages ──
for (const id of ids) {
  await b.viewport(1440, 900, false, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36");
  await b.go(`${base}/p/${id}`);
  const ok = await b.waitFor("document.querySelector('model-viewer')?.loaded === true", 40000);
  await sleep(1500);
  await b.shot(`${out}/${id}-d1.png`);
  const caps = await b.evalJS("JSON.stringify(window.__demo?.caps)");
  log(`\n[${id}] loaded=${ok} title="${await b.evalJS("document.title")}" caps=${caps}`);
  log("  note:", await b.evalJS("document.getElementById('arNote').textContent"));
  log("  buttons:", await b.evalJS("[...document.querySelectorAll('#parts button span')].map(s=>s.textContent).join(' | ')"));
  const keys = await b.evalJS("window.__demo.product.parts.map(p=>p.key)");
  for (const k of keys) { await b.evalJS(`document.getElementById('part-${k}').click()`); await sleep(1300); }
  await b.evalJS("document.getElementById('btnDims').click()");
  await sleep(900);
  await b.shot(`${out}/${id}-d2-open-dims.png`);
  log("  after opening:", await b.evalJS("JSON.stringify(window.__demo.state)"), "anim:", await b.evalJS("document.querySelector('model-viewer').animationName"));
  log("  dims:", await b.evalJS("[...document.querySelectorAll('.dim')].map(d=>d.textContent).join(' / ')"));
  const fin = await b.evalJS("window.__demo.product.finishes.length");
  if (fin > 1) {
    await b.evalJS("document.querySelectorAll('#swatches .swatch')[1].click()");
    await sleep(1000);
    log("  finish 2 ->", await b.evalJS("document.querySelector('model-viewer').variantName"));
    await b.shot(`${out}/${id}-d3-finish2.png`);
  }
  log("  QR:", await b.evalJS("!!document.querySelector('#qrCode svg')"), "specs rows:", await b.evalJS("document.querySelectorAll('#specs dt').length"));
}

// ── phone sizes, with faked Quick Look on iPhone ──
await b.send("Page.addScriptToEvaluateOnNewDocument", { source: `
  if (navigator.userAgent.includes('iPhone')) {
    const orig = DOMTokenList.prototype.supports;
    DOMTokenList.prototype.supports = function (t) { return t === 'ar' ? true : orig.call(this, t); };
    HTMLAnchorElement.prototype.click = function () { window.__quickLook = { href: this.href, rel: this.rel, img: !!this.querySelector('img') }; };
  }` });
for (const [label, ua] of [["iphone", IPHONE], ["android", ANDROID]]) {
  for (const id of ids) {
    await b.viewport(390, 844, true, ua);
    await b.go(`${base}/p/${id}`);
    await b.waitFor("document.querySelector('model-viewer')?.loaded === true", 40000);
    await sleep(1500);
    await b.shot(`${out}/${id}-${label}.png`);
    log(`\n[${id} ${label}] caps=${await b.evalJS("JSON.stringify(window.__demo.caps)")}`);
    log("  note:", await b.evalJS("document.getElementById('arNote').textContent"));
    log("  overflow:", await b.evalJS("document.documentElement.scrollWidth > innerWidth"));
    if (label === "iphone") {
      if (await b.evalJS("window.__demo.product.finishes.length") > 1) await b.evalJS("document.querySelectorAll('#swatches .swatch')[1].click()");
      await b.evalJS("document.getElementById('btnAR').click()");
      await sleep(500);
      log("  guide:", await b.evalJS("document.getElementById('sheetTitle')?.textContent"), "|", await b.evalJS("[...document.querySelectorAll('.g-row b')].map(x=>x.textContent).join(', ')"));
      await b.evalJS("document.getElementById('sheetGo').click()");
      await sleep(300);
      log("  quick look:", await b.evalJS("JSON.stringify(window.__quickLook)"));
      const href = await b.evalJS("window.__quickLook?.href");
      if (href) {
        const r = await fetch(href.split("#")[0]);
        log("  usdz fetch:", r.status, r.headers.get("content-type"), (await r.arrayBuffer()).byteLength);
      }
    }
  }
}
const errs = b.logs.filter((l) => /EXCEPTION|LOG |\[error\]/.test(l));
log("\nerrors:", errs.length ? "\n" + errs.join("\n") : "none");
fs.writeFileSync(`${out}/report.txt`, report.join("\n"));
b.close();
