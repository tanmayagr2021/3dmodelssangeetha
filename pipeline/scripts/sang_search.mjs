// Types a query into Sangeetha's search box and records the search API calls and results.
import fs from "node:fs";
import { launch, sleep } from "./cdp.mjs";
const [query, out, port = "9468"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await launch({ profile: `${out}/prof`, port: +port });
const reqs = new Map();
b.on("Network.requestWillBeSent", (p) => { if (/\/b\//.test(p.request.url)) reqs.set(p.requestId, { url: p.request.url, method: p.request.method, body: p.request.postData }); });
b.on("Network.responseReceived", (p) => { const r = reqs.get(p.requestId); if (r) r.status = p.response.status; });
await b.send("Network.enable");
await b.viewport(1440, 1000, false, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36");
await b.go("https://www.sangeetha.com/");
await sleep(6000);
await b.evalJS(`(() => { const i = document.querySelector('input[type=search], input[placeholder*="Search"]'); i.focus(); return !!i; })()`);
await b.send("Input.insertText", { text: query });
await sleep(2500);
await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
await sleep(8000);
console.log("url:", await b.evalJS("location.href"));
let i = 0;
for (const [rid, r] of reqs) {
  if (r.status && /search|product/i.test(r.url)) {
    const res = await b.send("Network.getResponseBody", { requestId: rid });
    const body = res.result?.base64Encoded ? Buffer.from(res.result.body, "base64").toString() : res.result?.body;
    if (body) fs.writeFileSync(`${out}/resp-${i}.json`, body);
    console.log(i, r.method, r.status, r.url.slice(0, 140), "|", (r.body || "").slice(0, 150), "|", body ? body.length : 0);
  }
  i++;
}
const links = await b.evalJS(`JSON.stringify([...document.querySelectorAll('a[href*="product-details"]')].map(a => a.href).slice(0, 20))`);
console.log("links:", links);
await b.shot(`${out}/page.png`);
b.close();
