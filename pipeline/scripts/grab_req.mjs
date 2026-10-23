// Records requests (method, url, headers, body) and response status for URLs matching a pattern.
import fs from "node:fs";
import { launch, sleep } from "./cdp.mjs";
const [url, out, pattern, port = "9463"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await launch({ profile: `${out}/prof`, port: +port });
const reqs = new Map();
b.on("Network.requestWillBeSent", (p) => { if (new RegExp(pattern).test(p.request.url)) reqs.set(p.requestId, { url: p.request.url, method: p.request.method, headers: p.request.headers, body: p.request.postData }); });
b.on("Network.responseReceived", (p) => { const r = reqs.get(p.requestId); if (r) r.status = p.response.status; });
b.on("Network.loadingFailed", (p) => { const r = reqs.get(p.requestId); if (r) r.failed = p.errorText; });
await b.send("Network.enable");
await b.viewport(1440, 1000, false, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36");
await b.go(url);
await sleep(+(process.env.WAIT || 12000));
let i = 0;
for (const [rid, r] of reqs) {
  if (r.status) {
    const res = await b.send("Network.getResponseBody", { requestId: rid });
    const body = res.result?.base64Encoded ? Buffer.from(res.result.body, "base64").toString() : res.result?.body;
    if (body) fs.writeFileSync(`${out}/resp-${i}.json`, body);
    r.saved = body ? `resp-${i}.json (${body.length})` : "no body";
  }
  i++;
}
fs.writeFileSync(`${out}/requests.json`, JSON.stringify([...reqs.values()], null, 1));
for (const r of reqs.values()) console.log(r.method, r.status ?? r.failed, r.url.slice(0, 110), "| body:", (r.body || "").slice(0, 160), "|", r.saved || "");
b.close();
