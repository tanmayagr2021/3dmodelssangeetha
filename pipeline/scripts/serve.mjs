// Static server for the demo site with the same /p/:id rewrite as vercel.json.
// usage: node serve.mjs <siteDir> <port> [extraDir mounted at /__test]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const [root, port, extra] = process.argv.slice(2);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".glb": "model/gltf-binary", ".usdz": "model/vnd.usdz+zip", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let base = root;
  // PRODUCTS=<file> serves another catalogue in place of /products.json (to test a new product alone)
  if (p === "/products.json" && process.env.PRODUCTS) { res.writeHead(200, { "Content-Type": TYPES[".json"] }); fs.createReadStream(process.env.PRODUCTS).pipe(res); return; }
  if (extra && p.startsWith("/__test/")) { base = extra; p = p.slice(7); }
  else if (/^\/p\/[^/]+\/?$/.test(p)) p = "/product.html";
  else if (p === "/") p = "/index.html";
  else if (!path.extname(p) && fs.existsSync(path.join(root, p + ".html"))) p += ".html";
  const file = path.join(base, path.normalize(p));
  if (!file.startsWith(base) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(+port, () => console.log("serving", root, "on", port));
