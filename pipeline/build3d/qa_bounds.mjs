import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const mulPt = (m, p) => [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12], m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13], m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
function bbox(node) {
  let mn = [1e9,1e9,1e9], mx = [-1e9,-1e9,-1e9];
  node.traverse((n) => {
    const mesh = n.getMesh(); if (!mesh) return;
    const m = n.getWorldMatrix();
    for (const p of mesh.listPrimitives()) {
      const a = p.getAttribute("POSITION"); const lo = a.getMin([]), hi = a.getMax([]);
      for (let i = 0; i < 8; i++) { const c = [i&1?hi[0]:lo[0], i&2?hi[1]:lo[1], i&4?hi[2]:lo[2]]; const w = mulPt(m, c); for (let k=0;k<3;k++){mn[k]=Math.min(mn[k],w[k]);mx[k]=Math.max(mx[k],w[k]);} }
    }
  });
  return [mn, mx];
}
const [file] = process.argv.slice(2);
const doc = await io.read(file);
const byName = (n) => doc.getRoot().listNodes().find((x) => x.getName() === n);
const cab = byName("Cabinet"); const [cmn, cmx] = bbox(cab);
console.log("cabinet", cmn.map((v)=>v.toFixed(3)), cmx.map((v)=>v.toFixed(3)));
const fzFront = byName("FzBoxFront"), fzL = byName("FzBoxL"), fzR = byName("FzBoxR"), fzFloor = byName("FzBoxFloor"), fzBack = byName("FzBoxBack");
let drawer = null;
if (fzFront) { const f = bbox(fzFront), l = bbox(fzL), r = bbox(fzR), b = bbox(fzBack), fl = bbox(fzFloor); drawer = { zMax: f[1][2], zMin: b[0][2], xMin: l[1][0] - 0.004, xMax: r[0][0] + 0.004, yMin: fl[1][1] }; console.log("drawer", JSON.stringify(drawer)); }
const stock = doc.getRoot().listNodes().filter((n) => n.getExtras()?.stock);
let bad = 0;
const inDoor = (n) => { for (let p = n.getParentNode?.(); p; p = p.getParentNode?.()) { const nm = p.getName?.(); if (nm === "FridgeDoor" || nm === "FreezerDoor") return true; } return false; };
for (const s of stock) {
  if (inDoor(s)) continue;
  const [mn, mx] = bbox(s);
  // only items inside the cabinet (not door baskets): they sit inside the cabinet's x/z range at the start
  const cx = (mn[0]+mx[0])/2;
  const inCab = cx > cmn[0] && cx < cmx[0] && mx[2] < cmx[2] + 0.1 && mn[2] > cmn[2];
  const issues = [];
  if (mn[0] < cmn[0] - 0.001 || mx[0] > cmx[0] + 0.001) issues.push("x outside cabinet");
  if (mx[2] > cmx[2] - 0.045) issues.push("z beyond front " + (mx[2]).toFixed(3));
  if (mn[2] < cmn[2] + 0.02) issues.push("z behind back " + mn[2].toFixed(3));
  if (drawer && mn[1] < drawer.yMin + 0.3 && mx[1] > drawer.yMin - 0.01 && mn[1] > drawer.yMin - 0.02 && mx[1] < drawer.yMin + 0.4) {
    // inside the vegetable drawer's height band
    if (mx[2] > drawer.zMax + 0.001) issues.push("through drawer front by " + ((mx[2]-drawer.zMax)*100).toFixed(1) + " cm");
    if (mn[0] < drawer.xMin - 0.001 || mx[0] > drawer.xMax + 0.001) issues.push("through drawer side");
    if (mn[1] < drawer.yMin - 0.005) issues.push("below drawer floor");
  }
  if (issues.length) { bad++; console.log("  BAD", s.getName(), issues.join("; "), "x", mn[0].toFixed(3), mx[0].toFixed(3), "y", mn[1].toFixed(3), mx[1].toFixed(3), "z", mn[2].toFixed(3), mx[2].toFixed(3)); }
}
console.log(file.split("/").pop(), "stock items", stock.length, "problems", bad);
