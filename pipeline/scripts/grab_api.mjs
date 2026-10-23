// Loads a page and saves the bodies of API responses whose URL matches a pattern.
import fs from "node:fs";
import { launch, sleep } from "./cdp.mjs";
const [url, out, pattern = "product-details", port = "9461"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await launch({ profile: `${out}/prof`, port: +port });
const hits = [];
b.on("Network.responseReceived", (p) => { if (new RegExp(pattern).test(p.response.url)) hits.push(p); });
await b.send("Network.enable");
await b.viewport(1440, 1000, false, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36");
await b.go(url);
await sleep(+(process.env.WAIT || 10000));
let i = 0;
for (const h of hits) {
  const r = await b.send("Network.getResponseBody", { requestId: h.requestId });
  const body = r.result?.base64Encoded ? Buffer.from(r.result.body, "base64").toString() : r.result?.body;
  const req = await b.send("Network.getRequestPostData", { requestId: h.requestId });
  fs.writeFileSync(`${out}/api-${i}.json`, body || "");
  console.log(i++, h.response.url, "post:", (req.result?.postData || "").slice(0, 200), "bytes:", (body || "").length);
}
await b.shot(`${out}/page.png`);
b.close();
