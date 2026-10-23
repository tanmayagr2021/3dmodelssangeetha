// Screenshots of the redesigned product page and its AR guide on each platform.
import fs from "node:fs";
import { launch, sleep } from "./cdp.mjs";
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const UA = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  desktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};
const b = await launch({ profile: `${out}/prof`, port: 9455 });
await b.send("Page.addScriptToEvaluateOnNewDocument", { source: `
  if (navigator.userAgent.includes('iPhone')) {
    const orig = DOMTokenList.prototype.supports;
    DOMTokenList.prototype.supports = function (t) { return t === 'ar' ? true : orig.call(this, t); };
    HTMLAnchorElement.prototype.click = function () { if (this.rel === 'ar') window.__quickLook = this.href; };
  }` });
const id = process.argv[4] || "godrej-rt-eonvogue-280c";
for (const [name, w, h, mobile] of [["iphone", 390, 844, true], ["android", 390, 844, true], ["desktop", 1440, 900, false]]) {
  await b.viewport(w, h, mobile, UA[name]);
  await b.go(`${base}/p/${id}`);
  await b.waitFor("document.querySelector('model-viewer')?.loaded === true", 40000);
  await sleep(1800);
  await b.shot(`${out}/${name}-1.png`);
  await b.evalJS("document.getElementById('btnAR').click()");
  await sleep(700);
  await b.shot(`${out}/${name}-2-guide.png`);
  console.log(name, await b.evalJS("JSON.stringify(window.__demo.caps)"), "| sheet:", await b.evalJS("document.getElementById('sheetTitle')?.textContent"));
  if (name === "iphone") {
    await b.evalJS("document.getElementById('sheetGo').click()");
    await sleep(300);
    console.log("  quick look href:", await b.evalJS("window.__quickLook"));
  }
}
console.log(b.logs.filter((l) => /EXCEPTION|LOG |\[error\]/.test(l)).join("\n") || "no errors");
b.close();
