// Writes the banner Apple's AR view shows along the bottom of the camera view, one per
// product (Quick Look's `custom` URL parameter). Quick Look renders the HTML only, with
// no scripts or links, at 81 points high for customHeight=small.
// usage: node make_banners.mjs <siteDir>
import fs from "node:fs";

const site = process.argv[2];
const { products } = JSON.parse(fs.readFileSync(`${site}/products.json`, "utf8"));
// the maker's size, the way the banner shows it: "60 × 172 × 71 cm"
const dims = (s) => `${parseFloat(s.w)} × ${parseFloat(s.h)} × ${parseFloat(s.d)} cm`;
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
fs.mkdirSync(`${site}/banners`, { recursive: true });
for (const f of fs.readdirSync(`${site}/banners`)) fs.unlinkSync(`${site}/banners/${f}`);
for (const p of products) {
  const [verb, ...rest] = p.arTip.split(" to ");
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.brand)} ${esc(p.shortName)}</title>
<style>
html, body { margin: 0; height: 100%; background: #0e0e0f; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased; }
.b { display: flex; align-items: center; gap: 12px; height: 100%; padding: 0 14px 0 16px; box-sizing: border-box; }
.i { width: 44px; height: 44px; border-radius: 12px; background: #F58A29; display: flex; align-items: center; justify-content: center; flex: none; }
.i svg { width: 26px; height: 26px; }
.t { min-width: 0; flex: 1; }
.t b { display: block; font-size: 15.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.t span { display: block; margin-top: 2px; font-size: 13px; color: #c9c9cc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.t em { font-style: normal; font-weight: 600; color: #F7A35C; }
.l { height: 26px; flex: none; }
</style></head>
<body><div class="b">
<div class="i"><svg viewBox="0 0 24 24" fill="none" stroke="#0e0e0f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10"/><path d="M12 9.5a1.5 1.5 0 0 1 3 0V11"/><path d="M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.6-2.2L4.6 16a1.6 1.6 0 0 1 2.4-2.1L9 15.5"/></svg></div>
<div class="t"><b>${esc(p.brand)} ${esc(p.shortName)}</b><span>Real size, locked: ${esc(dims(p.size))}</span><span><em>${esc(verb)}</em> to ${esc(rest.join(" to "))}</span></div>
<img class="l" src="/logos/sangeetha.png" alt="Sangeetha">
</div></body></html>
`;
  fs.writeFileSync(`${site}/banners/${p.id}.html`, html);
  console.log("wrote banners/" + p.id + ".html");
}
