// Renders a model in several poses and puts the renders next to the reference photo.
import fs from "node:fs";
import { launch, sleep } from "./cdp.mjs";
const [base, src, out, w = "600", h = "800", ...views] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await launch({ profile: `${out}/prof`, port: +(process.env.PORT || 9470) });
await b.viewport(+w, +h);
let i = 0;
for (const v of views) {
  const [orbit, anim = ""] = v.split("|");
  await b.go(`${base}/__test/compare.html?src=${encodeURIComponent(src)}&orbit=${encodeURIComponent(orbit)}&anim=${anim}&w=${w}&h=${h}`);
  await b.waitFor("window.__ready === true", 40000);
  await sleep(1800);
  await b.shot(`${out}/view-${i++}.png`, { x: 0, y: 0, width: +w, height: +h, scale: 1 });
}
console.log(b.logs.filter((l) => /EXC|error/i.test(l)).join("\n") || "rendered " + i);
b.close();
