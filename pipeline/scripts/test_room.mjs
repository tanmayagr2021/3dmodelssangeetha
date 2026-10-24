// Checks "See it in your room" on every product: the photo advice, a photo going in, the product standing in
// it at the size the camera model predicts, dragging (slow and fast), the suggested spots, turning, opening
// parts, the fine-tune sliders, saving the picture, an upright photo and a broken file.
// The test photo is drawn in the page, so nothing needs to be on disk.
// usage: node test_room.mjs <baseUrl> <outDir>
import fs from "node:fs";
import { launch, sleep } from "./cdp.mjs";

const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
let failed = 0;
const ok = (c, msg) => { console.log(`  ${c ? "ok  " : "FAIL"} ${msg}`); if (!c) failed++; };

// a level 26 mm-equivalent photo: eye line at the middle, a wall-floor line 4.5 m away, a sofa and a plant on the wall
const MAKE_PHOTO = `(async (portrait) => {
  const W = 1600, H = 1000, f = 26 / 43.27 * Math.hypot(W, H), yw = 500 + 1.4 * f / 4.5;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#ded6c4"; g.fillRect(0, 0, W, yw);
  g.fillStyle = "#b98d62"; g.fillRect(0, yw, W, H - yw);
  g.fillStyle = "#f5f3ee"; g.fillRect(0, yw - 22, W, 22);
  g.fillStyle = "#46598a"; g.fillRect(80, yw - 250, 440, 260);
  g.fillStyle = "#3c7846"; g.beginPath(); g.ellipse(1290, yw - 165, 50, 85, 0, 0, 7); g.fill();
  g.fillStyle = "#a9c6e6"; g.fillRect(1180, 120, 300, 300);
  const src = portrait ? (() => { const p = document.createElement("canvas"); p.width = 800; p.height = 1000; p.getContext("2d").drawImage(c, 300, 0, 800, 1000, 0, 0, 800, 1000); return p; })() : c;
  const blob = await new Promise((r) => src.toBlob(r, "image/jpeg", 0.92));
  return new File([blob], "room.jpg", { type: "image/jpeg" });
})`;
const UPLOAD = (portrait) => `(async()=>{const f=await ${MAKE_PHOTO}(${portrait});const dt=new DataTransfer();dt.items.add(f);const i=document.getElementById('roomFile');i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}));return 1})()`;

const b = await launch({ profile: `${out}/prof`, port: +(process.env.PORT || 9477) });
await b.viewport(1280, 860, false);
const mouse = (type, x, y) => b.send("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" ? "none" : "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
const handleRect = async () => JSON.parse(await b.evalJS(`JSON.stringify(document.querySelector('.room-drag').getBoundingClientRect())`));
const dataset = async () => JSON.parse(await b.evalJS(`JSON.stringify(document.querySelector('.room').dataset)`));
const click = (sel) => b.evalJS(`document.querySelector('${sel}').click()`);
// the product's drawn height, from a render of it with a see-through background (alpha > 0)
const drawnHeight = () => b.evalJS(`(async()=>{const m=document.querySelector('.room-model');const bm=await createImageBitmap(await m.toBlob({mimeType:'image/png'}));const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;const x=c.getContext('2d');x.drawImage(bm,0,0);const d=x.getImageData(0,0,c.width,c.height).data;let top=-1,bot=-1;for(let y=0;y<c.height;y++){let hit=false;for(let xx=0;xx<c.width;xx+=3){if(d[(y*c.width+xx)*4+3]>40){hit=true;break}}if(hit){if(top<0)top=y;bot=y}}return JSON.stringify({h:(bot-top+1)/(c.height/m.getBoundingClientRect().height)})})()`).then(JSON.parse);

const catalogue = JSON.parse(await (await fetch(`${base}/products.json`)).text());
for (const p of catalogue.products) {
  console.log(`[${p.id}]`);
  const wall = p.placement === "wall";
  const Hm = parseFloat(p.size.h) / 100;
  await b.go(`${base}/p/${p.id}`);
  await b.waitFor("document.querySelector('#viewer')?.loaded === true", 60000);
  ok(await b.evalJS(`!!document.getElementById('btnRoom') && document.getElementById('btnRoom').offsetParent !== null`), "the right-hand panel has the \"try it in a photo\" button");
  await click("#btnRoom"); await sleep(400);
  const intro = await b.evalJS(`document.querySelector('.room-card').innerText`);
  ok(/landscape/i.test(intro) && /eye level/i.test(intro) && /floor/i.test(intro), "the advice asks for a straight, landscape, eye-level photo with the floor in view");
  ok(await b.evalJS(`!!document.getElementById('roomCam').getAttribute('capture')`), "\"Take a photo\" opens the camera on a phone");
  ok(/Nothing is uploaded/.test(intro), "says the photo stays on the device");
  await b.evalJS(UPLOAD(false));
  ok(await b.waitFor("document.querySelector('.room-model')?.loaded === true", 60000), "the product loads over the photo");
  await sleep(1200);
  const d0 = await dataset();
  ok(+d0.k > 0 && +d0.yb > +d0.yh || wall, "it has a spot on the photo");
  if (!wall) {
    const k = +d0.k, expected = Hm * (+d0.yb - +d0.yh) / +d0.hc;     // photo pixels
    const drawn = (await drawnHeight()).h / k;
    ok(Math.abs(drawn - expected) / expected < 0.05, `drawn height ${drawn.toFixed(0)} px is within 5% of the ${expected.toFixed(0)} px real size at that floor row`);
  } else {
    const k = +d0.k, expected = Hm * +d0.focal / +d0.dist;                // photo pixels, at its distance from the camera
    const drawn = (await drawnHeight()).h / k;
    ok(Math.abs(drawn - expected) / expected < 0.05, `drawn height ${drawn.toFixed(0)} px is within 5% of the ${expected.toFixed(0)} px real size at ${(+d0.dist).toFixed(1)} m`);
  }
  // dragging: slow, then a fast flick; moving back up the photo should shrink a floor unit
  let r = await handleRect();
  const x0 = r.x + r.width / 2, y0 = r.y + r.height / 2;
  await mouse("mousePressed", x0, y0);
  for (let i = 1; i <= 8; i++) { await mouse("mouseMoved", x0 - i * 20, y0 - i * 5); await sleep(25); }
  await mouse("mouseReleased", x0 - 160, y0 - 40); await sleep(400);
  r = await handleRect();
  ok(Math.abs(r.x + r.width / 2 - (x0 - 160)) < 12, "dragging moves it with the finger");
  const d1 = await dataset();
  if (!wall) ok(+d1.yb < +d0.yb && +d1.k > 0, "dragging up the photo puts it further back");
  const mid = r.x + r.width / 2, midY = r.y + r.height / 2;
  await mouse("mousePressed", mid, midY);
  for (let i = 1; i <= 3; i++) { await mouse("mouseMoved", mid + i * 150, midY + i * 20); await sleep(10); }
  await mouse("mouseReleased", mid + 450, midY + 60); await sleep(500);
  const r2 = await handleRect();
  ok(r2.x + r2.width / 2 > mid + 300, "a fast flick keeps hold of it");
  if (!wall) { const d2 = await dataset(); ok(+d2.yb > +d1.yb, "dragging down the photo brings it nearer, and it is drawn larger"); }
  // another spot, size, parts, fine-tune
  const before = await handleRect();
  await click("#roomAgain"); await sleep(400);
  const after = await handleRect();
  ok(Math.abs(after.x - before.x) > 5 || Math.abs(after.y - before.y) > 5, "\"Another spot\" moves it to a different place");
  await click("#roomBigger"); await sleep(300);
  ok(/10[0-9]%|1[1-9][0-9]%/.test(await b.evalJS(`document.getElementById('roomSizeOut').textContent`)), "the size nudge shows a percentage");
  await click("#roomSizeOut"); await sleep(200);
  ok(/Real size/.test(await b.evalJS(`document.getElementById('roomSizeOut').textContent`)), "tapping it goes back to real size");
  for (const part of p.parts || []) {
    await click(`[data-part="${part.key}"]`); await sleep(1300);
    ok((await b.evalJS(`document.querySelector('[data-part="${part.key}"]').getAttribute('aria-pressed')`)) === "true", `${part.label} opens`);
  }
  await b.evalJS(`document.getElementById('roomFine').open = true;1`);
  await b.evalJS(`(()=>{const i=document.getElementById('hcIn');i.value=1.0;i.dispatchEvent(new Event('input',{bubbles:true}));return 1})()`); await sleep(300);
  const d3 = await dataset();
  ok(+d3.hc === 1, "the phone-height slider changes the camera height");
  // save
  await b.evalJS(`window.__dl=null;const o=HTMLAnchorElement.prototype.click;if(!window.__patched){HTMLAnchorElement.prototype.click=function(){if(this.download){window.__dl={name:this.download,href:this.href}}else o.call(this)};window.__patched=1}navigator.canShare=undefined;1`);
  await click("#roomSave"); await sleep(2500);
  const size = await b.evalJS(`(async()=>{if(!window.__dl)return 0;const r=await fetch(window.__dl.href);return (await r.blob()).size})()`);
  ok(size > 20000, `Save picture gives a JPEG (${size} bytes)`);
  await b.shot(`${out}/${p.id}.png`);
  // a broken file and an upright photo
  await click("#roomNew"); await sleep(300);
  await b.evalJS(`(()=>{const f=new File([new Uint8Array([1,2,3,4])],'x.jpg',{type:'image/jpeg'});const dt=new DataTransfer();dt.items.add(f);const i=document.getElementById('roomFile');i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}));return 1})()`); await sleep(600);
  ok(/could not read/i.test(await b.evalJS(`document.getElementById('roomError').textContent`)), "a broken photo gets a clear message");
  await b.evalJS(UPLOAD(true));
  await b.waitFor("document.querySelector('.room-model')?.loaded === true", 60000); await sleep(600);
  ok(/upright/i.test(await b.evalJS(`document.getElementById('roomNote').innerText`)), "an upright photo is told to retake it sideways");
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); await sleep(300);
  ok(await b.evalJS(`!document.querySelector('.room')`), "Escape closes it");
}
const errs = b.logs.filter((l) => /EXCEPTION|LOG |\[error\]/.test(l));
ok(errs.length === 0, errs.length ? errs.join(" | ") : "no console errors");
console.log(`\n${failed} failed checks`);
b.close();
process.exit(failed ? 1 : 0);
