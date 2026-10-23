// Renders an SVG logo to a transparent PNG at a given width. usage: node rasterize_svg.mjs in.svg out.png width
import fs from "node:fs";
import { Resvg } from "@resvg/resvg-js";
const [inp, out, width = "1200"] = process.argv.slice(2);
const png = new Resvg(fs.readFileSync(inp), { fitTo: { mode: "width", value: +width }, background: "rgba(0,0,0,0)" }).render().asPng();
fs.writeFileSync(out, png);
console.log(out, png.length);
