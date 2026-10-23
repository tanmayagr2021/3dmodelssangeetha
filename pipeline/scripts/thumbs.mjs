// Renders a catalogue thumbnail for each product through the temporary _thumb.html page.
import fs from "node:fs";
import { launch, sleep } from "./cdp.mjs";

const [base, siteDir, profile] = process.argv.slice(2);
const { products } = JSON.parse(fs.readFileSync(`${siteDir}/products.json`, "utf8"));
const b = await launch({ profile, port: 9451 });
await b.viewport(720, 540);
fs.mkdirSync(`${siteDir}/thumbs`, { recursive: true });
const ORBIT = { Refrigerator: "-30deg 78deg 105%", "Air conditioner": "-24deg 80deg 100%", "Washing machine": "-30deg 76deg 105%" };
for (const p of products) {
  await b.go(`${base}/__test/_thumb.html?src=${encodeURIComponent(p.glb)}&orbit=${encodeURIComponent(ORBIT[p.category] || p.orbit)}`);
  const ok = await b.waitFor("document.getElementById('mv').loaded === true", 40000);
  await sleep(2500);
  const out = `${siteDir}${p.thumb}`;
  await b.shot(out, { x: 0, y: 0, width: 720, height: 540, scale: 1 });
  console.log(p.id, ok ? "ok" : "NOT LOADED", out, fs.statSync(out).size);
}
console.log(b.logs.filter((l) => /EXCEPTION|LOG|error/i.test(l)).join("\n"));
b.close();
