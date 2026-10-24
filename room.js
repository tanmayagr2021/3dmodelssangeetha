// "See it in your room": the shopper gives a photo of the spot, the product stands in it at its real size,
// and can be dragged anywhere, turned, opened and saved as a picture. Everything runs in the browser; the
// photo is never uploaded.
//
// How the size is worked out (a pinhole camera, level, at eye height):
//   a floor point that appears `y - horizon` pixels below the eye-level line is `camera height * focal / (y - horizon)`
//   metres away, and one metre there is `focal / distance` pixels. So the product's front face, which touches the
//   floor at the row the shopper drags it to, is drawn at exactly its published size for that row, and it shrinks
//   or grows correctly as it is dragged up or down the picture.
//   The focal length comes from the photo's EXIF data when it has some (35 mm equivalent); otherwise a typical
//   phone's main camera (26 mm equivalent) is assumed. The camera height defaults to 1.4 m.
//   This is an estimate. It is only as good as the photo being level, so the sliders let the shopper correct it.
//
// The suggested spot is a plain heuristic, not a trained model: it finds the strongest wall-to-floor line and the
// calmest (least cluttered) stretch of wall along it that is wide enough for the product.

const CSS = `
.room { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; background: #0E0E0F; color: #F4F4F5; font-family: var(--sans, Outfit, -apple-system, Arial, sans-serif); -webkit-font-smoothing: antialiased; }
.room * { box-sizing: border-box; }
.room.hide, .room .hide { display: none !important; }
.room-top { display: flex; align-items: center; gap: 12px; padding: 12px 16px; padding-top: max(12px, env(safe-area-inset-top, 0px)); border-bottom: 1px solid #26262A; }
.room-top b { font-size: 17px; font-weight: 600; }
.room-top span { font-size: 13px; color: #A6A7AD; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.room-x { margin-left: auto; flex: none; width: 40px; height: 40px; border: 0; border-radius: 50%; background: #26262A; color: #F4F4F5; display: grid; place-items: center; }
.room-x svg { width: 18px; height: 18px; }
.room button { font: inherit; color: inherit; cursor: pointer; }
.room button:focus-visible, .room input:focus-visible, .room select:focus-visible, .room summary:focus-visible, .room .room-drag:focus-visible { outline: 3px solid #F58A29; outline-offset: 2px; }

.room-intro { flex: 1; min-height: 0; overflow-y: auto; display: grid; place-items: center; padding: 20px 16px; }
.room-card { width: min(560px, 100%); background: #1A1A1D; border: 1px solid #2A2A2D; border-radius: 22px; padding: 26px 24px 22px; }
.room-card h2 { margin: 0 0 6px; font-weight: 500; font-size: 26px; line-height: 1.2; }
.room-card > p { margin: 0 0 18px; font-size: 15px; line-height: 1.5; color: #B9BAC0; }
.room-tips { list-style: none; margin: 0 0 20px; padding: 0; display: grid; gap: 12px; }
.room-tips li { display: flex; gap: 14px; align-items: flex-start; font-size: 15px; line-height: 1.45; }
.room-tips svg { flex: none; width: 34px; height: 34px; padding: 7px; border-radius: 10px; background: #26262A; color: #F58A29; }
.room-tips b { font-weight: 600; }
.room-btns { display: grid; gap: 10px; }
.room-primary { height: 54px; border: 0; border-radius: 14px; background: #F58A29; color: #0E0E0F; font-size: 17px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; }
.room-primary svg { width: 22px; height: 22px; }
.room-secondary { height: 48px; border: 1px solid #3A3A3F; border-radius: 14px; background: transparent; font-size: 15px; font-weight: 600; }
.room-privacy { margin: 14px 0 0; font-size: 12.5px; line-height: 1.45; color: #8E8F96; text-align: center; }
.room-error { margin: 0 0 14px; padding: 10px 14px; border-radius: 12px; background: #3B1E1C; color: #FFC9C4; font-size: 14px; line-height: 1.4; }

.room-work { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.room-stage { position: relative; flex: 1; min-height: 0; overflow: hidden; background: #000; touch-action: none; user-select: none; -webkit-user-select: none; }
.room-photo { position: absolute; display: block; pointer-events: none; }
.room-shadow { position: absolute; pointer-events: none; border-radius: 50%; background: radial-gradient(closest-side, rgba(0,0,0,.62), rgba(0,0,0,.34) 55%, rgba(0,0,0,0) 100%); filter: blur(2px); }
.room-model { position: absolute; pointer-events: none; background: transparent; --poster-color: transparent; --progress-bar-color: transparent; }
.room-model::part(default-progress-bar) { display: none; }
.room-model.wall { filter: drop-shadow(0 5px 7px rgba(0,0,0,.35)); }
.room-drag { position: absolute; border-radius: 10px; cursor: grab; touch-action: none; outline-offset: 0; }
.room-drag.grab { cursor: grabbing; }
.room-eye { position: absolute; left: 0; right: 0; height: 0; border-top: 2px dashed #F58A29; pointer-events: none; }
.room-eye i { position: absolute; right: 8px; top: 4px; font: 600 12px var(--sans, Outfit, Arial, sans-serif); color: #F58A29; font-style: normal; background: rgba(0,0,0,.55); padding: 2px 8px; border-radius: 99px; }
.room-note { position: absolute; left: 12px; right: 12px; top: 10px; display: flex; justify-content: center; pointer-events: none; }
.room-note span { max-width: 100%; background: rgba(14,14,15,.78); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); padding: 8px 14px; border-radius: 999px; font-size: 13.5px; line-height: 1.35; text-align: center; }
.room-loading { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.4); font-size: 15px; pointer-events: none; }

.room-bar { flex: none; background: #141416; border-top: 1px solid #26262A; padding: 12px 12px calc(12px + env(safe-area-inset-bottom, 0px)); display: grid; gap: 10px; max-height: 46vh; overflow-y: auto; }
.room-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center; }
.room-chip { display: inline-flex; align-items: center; gap: 7px; height: 42px; padding: 0 15px; border: 1px solid #3A3A3F; border-radius: 999px; background: #1E1E21; font-size: 14px; font-weight: 600; white-space: nowrap; }
.room-chip svg { width: 18px; height: 18px; flex: none; color: #F58A29; }
.room-chip[aria-pressed="true"] { background: #F4F4F5; color: #0E0E0F; border-color: #F4F4F5; }
.room-chip.solid { background: #F58A29; border-color: #F58A29; color: #0E0E0F; }
.room-chip.solid svg { color: #0E0E0F; }
.room-chip.icon { width: 42px; padding: 0; justify-content: center; }
.room-size { display: inline-flex; align-items: center; gap: 4px; }
.room-size output { min-width: 62px; text-align: center; font-size: 13px; color: #B9BAC0; }
.room-fine { border: 1px solid #2A2A2D; border-radius: 14px; padding: 0 14px; background: #1A1A1D; }
.room-fine summary { cursor: pointer; list-style: none; padding: 12px 0; font-size: 14px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
.room-fine summary::-webkit-details-marker { display: none; }
.room-fine summary::after { content: "+"; font-size: 20px; color: #F58A29; }
.room-fine[open] summary::after { content: "–"; }
.room-fine .body { display: grid; gap: 14px; padding: 2px 0 14px; }
.room-fine label { display: grid; gap: 6px; font-size: 13px; color: #B9BAC0; }
.room-fine label span { display: flex; justify-content: space-between; }
.room-fine label span b { color: #F4F4F5; font-weight: 600; }
.room-fine input[type=range] { width: 100%; accent-color: #F58A29; }
.room-fine select { height: 40px; border-radius: 10px; border: 1px solid #3A3A3F; background: #1E1E21; color: #F4F4F5; padding: 0 10px; font: inherit; }
.room-fine p { margin: 0; font-size: 12.5px; line-height: 1.5; color: #8E8F96; }
@media (max-width: 899px) {
  .room-top b { white-space: nowrap; font-size: 16px; }
  .room-top span { display: none; }
  .room-bar { padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px)); gap: 7px; max-height: 40vh; }
  .room-chip { height: 38px; padding: 0 12px; font-size: 13px; gap: 6px; }
  .room-chip.icon { width: 38px; padding: 0; }
  .room-row { gap: 6px; }
  .room-card { padding: 20px 18px 18px; }
  .room-card h2 { font-size: 23px; }
}
@media (min-width: 900px) {
  .room-work { flex-direction: row; }
  .room-bar { width: 340px; max-height: none; border-top: 0; border-left: 1px solid #26262A; align-content: start; padding: 16px; }
  .room-row { justify-content: flex-start; }
}
`;

const ICON = {
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/></svg>',
  landscape: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="19" cy="12" r=".8" fill="currentColor"/></svg>',
  level: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.7-6.5 10-6.5S22 12 22 12s-3.7 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
  wall: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v13H3z"/><path d="M1 20h22M3 16l-2 4M21 16l2 4"/></svg>',
  turn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>',
  turnL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/></svg>',
  spot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 9"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  door: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="1.5"/><path d="M15 9v3"/></svg>',
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const cm = (s) => parseFloat(s) / 100; // "63 cm" -> 0.63 m

// ── EXIF: the 35 mm-equivalent focal length, if the photo says it ──
function exifFocal35(buf) {
  try {
    const v = new DataView(buf);
    if (v.getUint16(0) !== 0xFFD8) return null;
    let off = 2;
    while (off < v.byteLength - 4) {
      const marker = v.getUint16(off);
      off += 2;
      if ((marker & 0xFF00) !== 0xFF00) return null;
      const len = v.getUint16(off);
      if (marker === 0xFFE1 && v.getUint32(off + 2) === 0x45786966) {
        const tiff = off + 8;
        const le = v.getUint16(tiff) === 0x4949;
        const g16 = (o) => v.getUint16(o, le), g32 = (o) => v.getUint32(o, le);
        const entries = (ifd) => { const n = g16(ifd), out = {}; for (let i = 0; i < n; i++) out[g16(ifd + 2 + i * 12)] = ifd + 2 + i * 12 + 8; return out; };
        const ifd0 = entries(tiff + g32(tiff + 4));
        if (!ifd0[0x8769]) return null;
        const sub = entries(tiff + g32(ifd0[0x8769]));
        if (!sub[0xA405]) return null;
        const f = g16(sub[0xA405]);
        return f >= 8 && f <= 300 ? f : null;
      }
      if (marker === 0xFFDA) return null;
      off += len;
    }
  } catch { /* no usable EXIF */ }
  return null;
}

// the photo, turned upright and no bigger than 2400 px a side, as an object URL
async function readPhoto(file) {
  const buf = await file.arrayBuffer();
  const f35 = exifFocal35(buf);
  const url = URL.createObjectURL(new Blob([buf], { type: file.type || "image/jpeg" }));
  const img = new Image();
  img.decoding = "async";
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("decode")); img.src = url; });
  const w0 = img.naturalWidth, h0 = img.naturalHeight;
  const k = Math.min(1, 2400 / Math.max(w0, h0));
  const c = document.createElement("canvas");
  c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.92));
  // brightness, to match the product's lighting to the room
  const s = ctx.getImageData(0, 0, c.width, c.height);
  let sum = 0, n = 0;
  for (let i = 0; i < s.data.length; i += 4 * 97) { sum += 0.2126 * s.data[i] + 0.7152 * s.data[i + 1] + 0.0722 * s.data[i + 2]; n++; }
  return { url: URL.createObjectURL(blob), blob, w: c.width, h: c.height, f35, luma: sum / n / 255, canvas: c };
}

// ── the suggested spot ──
function analyse(photo) {
  const gw = 300, gh = Math.max(60, Math.round(photo.h * gw / photo.w));
  const c = document.createElement("canvas");
  c.width = gw; c.height = gh;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(photo.canvas, 0, 0, gw, gh);
  const d = ctx.getImageData(0, 0, gw, gh).data;
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  const gx = new Float32Array(gw * gh), gy = new Float32Array(gw * gh);
  for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
    const i = y * gw + x;
    gx[i] = (g[i + 1] - g[i - 1]) * 2 + (g[i - gw + 1] - g[i - gw - 1]) + (g[i + gw + 1] - g[i + gw - 1]);
    gy[i] = (g[i + gw] - g[i - gw]) * 2 + (g[i + gw - 1] - g[i - gw - 1]) + (g[i + gw + 1] - g[i - gw + 1]);
  }
  const G = new Float32Array(gw * gh);
  for (let i = 0; i < G.length; i++) G[i] = Math.abs(gx[i]) + Math.abs(gy[i]);
  // integral images of each colour channel, to compare a spot with the colour of the wall
  const CI = [0, 1, 2].map((ch) => {
    const T = new Float64Array((gw + 1) * (gh + 1));
    for (let y = 0; y < gh; y++) { let row = 0; for (let x = 0; x < gw; x++) { row += d[(y * gw + x) * 4 + ch]; T[(y + 1) * (gw + 1) + x + 1] = T[y * (gw + 1) + x + 1] + row; } }
    return T;
  });
  const meanRGB = (x0, y0, x1, y1) => {
    x0 = clamp(Math.round(x0), 0, gw); x1 = clamp(Math.round(x1), 0, gw); y0 = clamp(Math.round(y0), 0, gh); y1 = clamp(Math.round(y1), 0, gh);
    const n = Math.max(1, (x1 - x0) * (y1 - y0));
    return CI.map((T) => (T[y1 * (gw + 1) + x1] - T[y0 * (gw + 1) + x1] - T[y1 * (gw + 1) + x0] + T[y0 * (gw + 1) + x0]) / n);
  };
  // the colour most of the wall has: the median of the band just above a row
  const wallColour = (yE) => {
    const y0 = Math.max(0, Math.round(yE - 0.3 * gh)), y1 = Math.max(y0 + 2, Math.round(yE - 0.04 * gh));
    const ch = [[], [], []];
    for (let y = y0; y < y1; y += 2) for (let x = 0; x < gw; x += 2) for (let c = 0; c < 3; c++) ch[c].push(d[(y * gw + x) * 4 + c]);
    return ch.map((a) => { a.sort((p, q) => p - q); return a[a.length >> 1] || 128; });
  };
  // integral image of the edge energy
  const I = new Float64Array((gw + 1) * (gh + 1));
  for (let y = 0; y < gh; y++) { let row = 0; for (let x = 0; x < gw; x++) { row += G[y * gw + x]; I[(y + 1) * (gw + 1) + x + 1] = I[y * (gw + 1) + x + 1] + row; } }
  const sum = (x0, y0, x1, y1) => { x0 = clamp(Math.round(x0), 0, gw); x1 = clamp(Math.round(x1), 0, gw); y0 = clamp(Math.round(y0), 0, gh); y1 = clamp(Math.round(y1), 0, gh); return I[y1 * (gw + 1) + x1] - I[y0 * (gw + 1) + x1] - I[y1 * (gw + 1) + x0] + I[y0 * (gw + 1) + x0]; };
  // how strongly each row is a long horizontal line (a skirting board, the foot of the wall)
  const rows = new Float32Array(gh);
  for (let y = 2; y < gh - 2; y++) { let s = 0; for (let x = 0; x < gw; x++) s += Math.abs(gy[y * gw + x]); rows[y] = s / gw; }
  const mean = rows.reduce((a, b) => a + b, 0) / gh;
  const sd = Math.sqrt(rows.reduce((a, b) => a + (b - mean) ** 2, 0) / gh) || 1;
  const peaks = [];
  for (let y = 3; y < gh - 3; y++) if (rows[y] > rows[y - 1] && rows[y] >= rows[y + 1] && rows[y] > mean + 0.6 * sd) peaks.push({ y, s: (rows[y] - mean) / sd });
  peaks.sort((a, b) => b.s - a.s);
  return { gw, gh, sum, meanRGB, wallColour, peaks, scale: photo.w / gw, meanG: sum(0, 0, gw, gh) / (gw * gh) || 1 };
}

// ── the module ──
export function initRoom({ product, model, parts, onWall, toast, openButton }) {
  if (!openButton) return;
  const Wm = cm(product.size.w), Hm = cm(product.size.h), Dm = cm(product.size.d);
  const MOUNT_H = 2.1;                                  // where a wall unit is first hung (a suggestion, not a maker's figure)
  let root = null, S = null;

  openButton.addEventListener("click", open);

  function open() {
    if (root) return;
    if (!document.getElementById("room-css")) { const st = document.createElement("style"); st.id = "room-css"; st.textContent = CSS; document.head.appendChild(st); }
    S = { photo: null, hc: 1.4, yh: 0.5, lens: 26, userSize: 1, turn: 0, xb: 0, yb: 0, wallDist: 3.2, cand: [], ci: 0, open: Object.fromEntries(parts.map((p) => [p.key, false])), busy: false };
    root = document.createElement("div");
    root.className = "room";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "See it in your room");
    root.innerHTML = `
      <div class="room-top"><b>See it in your room</b><span>${product.shortName}</span><button class="room-x" aria-label="Close" type="button">${ICON.close}</button></div>
      <div class="room-intro" id="roomIntro">
        <div class="room-card">
          <h2>See it in your room</h2>
          <p>Give us a photo of the spot. The ${onWall ? "unit" : product.category.toLowerCase()} appears there at its real size, and you can drag it anywhere.</p>
          <ul class="room-tips">
            <li>${ICON.landscape}<div><b>Hold your phone sideways.</b><br>Take a wide, landscape photo.</div></li>
            <li>${ICON.level}<div><b>Hold it straight, at eye level.</b><br>Keep the phone level, not tilted up or down, and stand 2 to 3 metres back.</div></li>
            <li>${ICON.wall}<div><b>Show the wall and the floor.</b><br>${onWall ? "Take it straight at the wall where it will hang, with the floor at the bottom." : "Take it straight at the spot where it would stand, with the floor at the bottom. A wide-angle photo is fine, as long as it is level."}</div></li>
          </ul>
          <p class="room-error hide" id="roomError" role="alert"></p>
          <div class="room-btns">
            <button class="room-primary" id="roomShoot" type="button">${ICON.camera}Take a photo</button>
            <button class="room-secondary" id="roomPick" type="button">Choose a photo from your device</button>
          </div>
          <p class="room-privacy">Your photo stays on your device. Nothing is uploaded.</p>
        </div>
      </div>
      <div class="room-work hide" id="roomWork">
        <div class="room-stage" id="roomStage">
          <img class="room-photo" id="roomPhoto" alt="Your photo">
          <div class="room-shadow hide" id="roomShadow"></div>
          <div class="room-eye hide" id="roomEye"><i>Eye level</i></div>
          <div class="room-note" id="roomNote"><span></span></div>
          <div class="room-loading hide" id="roomLoading">Placing it…</div>
        </div>
        <div class="room-bar" id="roomBar"></div>
      </div>
      <input type="file" accept="image/*" capture="environment" class="hide" id="roomCam">
      <input type="file" accept="image/*" class="hide" id="roomFile">`;
    document.body.appendChild(root);
    document.documentElement.style.overflow = "hidden";
    const q = (id) => root.querySelector("#" + id);
    root.querySelector(".room-x").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    q("roomShoot").addEventListener("click", () => q("roomCam").click());
    q("roomPick").addEventListener("click", () => q("roomFile").click());
    for (const id of ["roomCam", "roomFile"]) q(id).addEventListener("change", (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) load(f); });
    q("roomShoot").focus();
    window.addEventListener("resize", layout);
  }

  function onKey(e) { if (e.key === "Escape") close(); }
  function close() {
    if (!root) return;
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", layout);
    if (S?.photo) URL.revokeObjectURL(S.photo.url);
    root.remove();
    root = null; S = null;
    document.documentElement.style.overflow = "";
    openButton.focus();
  }
  const q = (id) => root.querySelector("#" + id);

  async function load(file) {
    const err = q("roomError");
    err.classList.add("hide");
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) { err.textContent = "That file is not a picture. Please choose a photo."; err.classList.remove("hide"); return; }
    let photo;
    try { photo = await readPhoto(file); }
    catch { err.textContent = "We could not read that photo. Please try a JPEG or PNG, or take a new one."; err.classList.remove("hide"); return; }
    if (S.photo) URL.revokeObjectURL(S.photo.url);
    S.photo = photo;
    S.yh = 0.5; S.userSize = 1; S.turn = 0;
    S.lens = photo.f35 || 26;
    q("roomIntro").classList.add("hide");
    q("roomWork").classList.remove("hide");
    q("roomPhoto").src = photo.url;
    buildBar();
    makeModel();
    const a = analyse(photo);
    S.analysis = a;
    S.cand = candidates();
    S.ci = 0;
    applySpot(S.cand[0]);
    layout();
    const portrait = photo.h > photo.w * 1.05;
    note(portrait ? "This photo is upright. A sideways (landscape) photo looks more natural. You can retake it, or carry on." : S.cand.length ? "Suggested spot. Drag it wherever you like." : "Drag it to where you want it.", portrait ? 7000 : 5000);
  }

  // ── geometry ──
  const fPx = () => (S.lens / 43.27) * Math.hypot(S.photo.w, S.photo.h); // focal length in photo pixels
  const yhPx = () => S.yh * S.photo.h;
  function rect() { // where the photo is drawn inside the stage
    const st = q("roomStage"), W = st.clientWidth, H = st.clientHeight;
    const k = Math.min(W / S.photo.w, H / S.photo.h);
    return { x: (W - S.photo.w * k) / 2, y: (H - S.photo.h * k) / 2, k };
  }

  // the product's pose for the current spot: sizes and distances in photo pixels / metres
  function pose() {
    const f = fPx(), yh = yhPx();
    if (onWall) {
      const dW = S.wallDist / S.userSize;
      const k = f / dW;
      const Bw = Wm + 0.7, Bh = Hm + 0.7;
      return { f, yh, k, dFront: dW, d: dW + Dm / 2, Ew: Bw * k * 1.12, Eh: Bh * k * 1.12, xEl: S.xb, yEl: S.yb, body: { w: Wm * k, h: Hm * k, cx: S.xb, cy: S.yb }, tgt: [0, Hm / 2, Dm / 2] };
    }
    const dif = Math.max(4, S.yb - yh);
    const dFront = clamp((S.hc * f) / dif / S.userSize, 0.25, 40);
    const k = f / dFront;
    const d = dFront + Dm / 2;
    const Bw = Wm + 1.9, Bh = Hm * 1.2 + 0.2;
    const Ew = Bw * k * 1.1, Eh = Bh * k * 1.1;
    const yEl = S.yb - (f * (Hm / 2)) / dFront;
    return { f, yh, k, dFront, d, Ew, Eh, xEl: S.xb, yEl, body: { w: Wm * k, h: Hm * k, cx: S.xb, cy: S.yb - (Hm * k) / 2 }, tgt: [0, Hm / 2, 0] };
  }

  let raf = 0;
  function render() { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
  function draw() {
    if (!root || !S?.photo || !S.mv) return;
    const r = rect(), p = pose(), mv = S.mv, f = p.f;
    const px = (v) => v * r.k;
    // the 3D view is a crop of the photo camera: same focal length, centred on the product
    const el = mv;
    el.style.width = `${px(p.Ew)}px`; el.style.height = `${px(p.Eh)}px`;
    el.style.left = `${r.x + px(p.xEl - p.Ew / 2)}px`; el.style.top = `${r.y + px(p.yEl - p.Eh / 2)}px`;
    const fov = (2 * Math.atan(p.Eh / (2 * f)) * 180) / Math.PI;
    const yaw = -Math.atan((S.xb - S.photo.w / 2) / f) + S.turn;
    el.fieldOfView = `${fov.toFixed(3)}deg`;
    el.cameraOrbit = `${yaw}rad 90deg ${p.d.toFixed(4)}m`;
    el.cameraTarget = `${p.tgt[0]}m ${p.tgt[1]}m ${p.tgt[2]}m`;
    el.jumpCameraToGoal?.();
    // the handle to drag by sits over the product's body
    const h = S.drag, bw = Math.max(p.body.w, 56 / r.k), bh = Math.max(p.body.h, 56 / r.k);
    h.style.width = `${px(bw)}px`; h.style.height = `${px(bh)}px`;
    h.style.left = `${r.x + px(p.body.cx - bw / 2)}px`; h.style.top = `${r.y + px(p.body.cy - bh / 2)}px`;
    // the soft shadow on the floor under it (a floor unit only)
    const sh = q("roomShadow");
    if (!onWall) {
      const yBack = p.yh + (S.hc * f) / (p.dFront + Dm);
      const wShadow = Wm * (f / (p.dFront + Dm / 2)) * 1.3, hShadow = Math.max(8 / r.k, (S.yb - yBack) * 1.7);
      sh.classList.remove("hide");
      sh.style.width = `${px(wShadow)}px`; sh.style.height = `${px(hShadow)}px`;
      sh.style.left = `${r.x + px(S.xb - wShadow / 2)}px`; sh.style.top = `${r.y + px((S.yb + yBack) / 2 - hShadow / 2)}px`;
    } else sh.classList.add("hide");
    const eye = q("roomEye");
    eye.style.top = `${r.y + px(p.yh)}px`;
    // numbers a test can check the scale against: the floor row of the front face, the eye-level row, the phone height
    Object.assign(root.dataset, { yb: S.yb.toFixed(1), yh: p.yh.toFixed(1), hc: S.hc, focal: p.f.toFixed(1), k: r.k.toFixed(5), size: S.userSize.toFixed(3), dist: p.dFront.toFixed(3), wall: onWall ? "1" : "" });
  }
  function layout() {
    if (!root || !S?.photo) return;
    const r = rect();
    const img = q("roomPhoto");
    img.style.left = `${r.x}px`; img.style.top = `${r.y}px`; img.style.width = `${S.photo.w * r.k}px`; img.style.height = `${S.photo.h * r.k}px`;
    draw();
  }

  // ── the model ──
  function makeModel() {
    if (S.mv) S.mv.remove();
    const mv = document.createElement("model-viewer");
    mv.className = `room-model${onWall ? " wall" : ""}`;
    mv.setAttribute("src", model);
    mv.setAttribute("alt", `${product.brand} ${product.model} placed in your photo`);
    mv.setAttribute("environment-image", "neutral");
    mv.setAttribute("shadow-intensity", "0");
    mv.setAttribute("interaction-prompt", "none");
    mv.setAttribute("disable-zoom", "");
    mv.setAttribute("disable-pan", "");
    mv.setAttribute("disable-tap", "");
    mv.setAttribute("min-camera-orbit", "-Infinity 0deg 0.05m");
    mv.setAttribute("max-camera-orbit", "Infinity 180deg 200m");
    mv.setAttribute("min-field-of-view", "1deg");
    mv.setAttribute("max-field-of-view", "150deg");
    mv.setAttribute("reveal", "auto");
    mv.setAttribute("loading", "eager");
    mv.exposure = clamp(0.7 + S.photo.luma * 0.75, 0.8, 1.25);
    const stage = q("roomStage");
    stage.insertBefore(mv, q("roomNote"));
    S.mv = mv;
    const handle = document.createElement("div");
    handle.className = "room-drag";
    handle.tabIndex = 0;
    handle.setAttribute("role", "button");
    handle.setAttribute("aria-label", `Move the ${product.shortName}. Drag, or use the arrow keys.`);
    stage.appendChild(handle);
    S.drag = handle;
    q("roomLoading").classList.remove("hide");
    mv.addEventListener("load", () => { if (!root || S?.mv !== mv) return; q("roomLoading").classList.add("hide"); draw(); }, { once: true });
    // dragging: while a drag is on, the whole window listens, so a quick flick cannot outrun the handle
    let grab = null;
    const stageBox = () => stage.getBoundingClientRect();
    const onMove = (e) => {
      if (!grab) return;
      const r = rect(), b = stageBox();
      moveTo((e.clientX - b.left - r.x) / r.k - grab.dx, (e.clientY - b.top - r.y) / r.k - grab.dy);
    };
    const end = () => {
      grab = null;
      handle.classList.remove("grab");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    handle.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      e.preventDefault();
      const r = rect(), b = stageBox();
      grab = { dx: (e.clientX - b.left - r.x) / r.k - S.xb, dy: (e.clientY - b.top - r.y) / r.k - S.yb };
      handle.classList.add("grab");
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      note("", 0);
    });
    handle.addEventListener("keydown", (e) => {
      const step = (e.shiftKey ? 40 : 10) * (S.photo.w / 1000);
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0, dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      if (dx || dy) { e.preventDefault(); moveTo(S.xb + dx, S.yb + dy); }
    });
  }
  function moveTo(x, y) {
    const { w, h } = S.photo;
    S.xb = clamp(x, 0, w);
    S.yb = onWall ? clamp(y, 0, h) : clamp(y, yhPx() + 0.025 * h, h * 1.02);
    render();
  }

  // ── where to put it first ──
  function candidates() {
    const a = S.analysis, P = S.photo, f = fPx(), yh = yhPx();
    const out = [];
    const rowsPx = a.peaks.slice(0, 5).map((p) => p.y * a.scale);
    // if no line stands out, try plausible wall distances instead
    const fallbackRows = [2.6, 3.6, 4.8].map((d) => yh + (S.hc * f) / d);
    const wallRows = rowsPx.filter((y) => y > yh + 0.04 * P.h).slice(0, 3);
    for (const yE of (wallRows.length ? wallRows : fallbackRows)) {
      const dWall = (S.hc * f) / (yE - yh);
      if (dWall > 12) continue;
      let bw, bh, cx, cy, xr0, xr1, yTop, yBot;
      if (onWall) {
        if (dWall < 0.8) continue;
        const k = f / dWall;
        bw = Wm * k; bh = Hm * k;
        cy = yh + (f * (S.hc - MOUNT_H)) / dWall; cx = 0;
        yTop = cy - bh / 2; yBot = cy + bh / 2;
      } else {
        const dFront = dWall - Dm;
        if (dFront < 0.45) continue;
        const k = f / dFront;
        bw = Wm * k; bh = Hm * k;
        const yb = yh + (S.hc * f) / dFront;
        cy = yb; yTop = yb - bh; yBot = yb;
      }
      if (bw > P.w * 0.95) continue;
      const margin = P.w * 0.02;
      const wc = a.wallColour(yE / a.scale);
      for (let x = bw / 2 + margin; x <= P.w - bw / 2 - margin; x += P.w / 60) {
        const sx = 1 / a.scale;
        const clutter = a.sum((x - bw / 2) * sx, Math.max(0, yTop) * sx, (x + bw / 2) * sx, Math.min(P.h, yBot) * sx) / (Math.max(1, (bw * sx) * (Math.min(P.h, yBot) - Math.max(0, yTop)) * sx)) / a.meanG;
        const mc = a.meanRGB((x - bw / 2) * sx, Math.max(0, yTop) * sx, (x + bw / 2) * sx, Math.min(P.h, yBot) * sx);
        const colour = Math.hypot(mc[0] - wc[0], mc[1] - wc[1], mc[2] - wc[2]) / 441;   // 0 = the colour of the wall
        const off = yTop < 0 ? 1.2 : 0;                               // does not fit under the top of the photo
        const edge = Math.abs(x - P.w / 2) / P.w;
        const score = clutter + 3.2 * colour + off + 0.18 * edge;
        out.push({ x, y: onWall ? cy : cy, dWall, score, bw });
      }
    }
    out.sort((a, b) => a.score - b.score);
    const picked = [];
    for (const c of out) {
      if (picked.every((p) => Math.abs(p.x - c.x) > c.bw * 0.9 || Math.abs(p.dWall - c.dWall) > 0.5)) picked.push(c);
      if (picked.length >= 6) break;
    }
    if (!picked.length) { // nothing fits the picture: a middle-of-the-floor default
      const yb = P.h * 0.86;
      picked.push({ x: P.w / 2, y: yb, dWall: onWall ? 3.2 : (S.hc * f) / Math.max(4, yb - yh) + Dm });
    }
    return picked;
  }
  function applySpot(c) {
    if (!c) return;
    S.xb = c.x; S.yb = c.y;
    if (onWall) { S.wallDist = clamp(c.dWall, 1.2, 8); S.userSize = 1; }
    else S.userSize = 1;
  }

  // ── the controls ──
  function note(text, ms = 4500) {
    const n = q("roomNote").firstElementChild;
    n.textContent = text;
    q("roomNote").classList.toggle("hide", !text);
    clearTimeout(note.t);
    if (text && ms) note.t = setTimeout(() => q("roomNote")?.classList.add("hide"), ms);
  }
  function buildBar() {
    const bar = q("roomBar");
    const partBtns = parts.map((p) => `<button class="room-chip" type="button" data-part="${p.key}" aria-pressed="false">${ICON.door}<span>Open ${p.label}</span></button>`).join("");
    bar.innerHTML = `
      <div class="room-row">
        <button class="room-chip solid" type="button" id="roomAgain">${ICON.spot}Another spot</button>
        ${onWall ? "" : `<button class="room-chip icon" type="button" id="roomTurnL" aria-label="Turn it left">${ICON.turnL}</button><button class="room-chip icon" type="button" id="roomTurnR" aria-label="Turn it right">${ICON.turn}</button>`}
        <span class="room-size"><button class="room-chip icon" type="button" id="roomSmaller" aria-label="Make it smaller">${ICON.minus}</button><output id="roomSizeOut" aria-live="polite">Real size</output><button class="room-chip icon" type="button" id="roomBigger" aria-label="Make it bigger">${ICON.plus}</button></span>
      </div>
      ${parts.length ? `<div class="room-row">${partBtns}</div>` : ""}
      <details class="room-fine" id="roomFine">
        <summary>Fine-tune the size</summary>
        <div class="body">
          <p>The size is worked out from your photo, assuming the phone was level. If it looks too big or small, set where your phone was.</p>
          <label><span>Phone height <b id="hcOut">1.4 m</b></span><input id="hcIn" type="range" min="0.8" max="1.9" step="0.05" value="1.4"></label>
          <label><span>Eye-level line <b id="yhOut">middle</b></span><input id="yhIn" type="range" min="25" max="75" step="1" value="50"></label>
          ${onWall ? `<label><span>Distance to the wall <b id="wdOut">3.2 m</b></span><input id="wdIn" type="range" min="1.2" max="8" step="0.1" value="3.2"></label>` : ""}
          ${S.photo.f35 ? "" : `<label><span>Lens</span><select id="lensIn"><option value="26" selected>Normal (1×)</option><option value="14">Wide (0.5×)</option><option value="52">Zoomed (2×)</option></select></label>`}
          <p>${S.photo.f35 ? `Your photo says its lens is ${S.photo.f35} mm (35 mm equivalent), which is used for the size.` : "This photo has no lens details, so a normal phone lens is assumed."}</p>
        </div>
      </details>
      <div class="room-row">
        <button class="room-chip solid" type="button" id="roomSave">${ICON.save}Save picture</button>
        <button class="room-chip" type="button" id="roomNew">${ICON.photo}New photo</button>
      </div>`;
    const $ = (id) => bar.querySelector("#" + id);
    $("roomAgain").addEventListener("click", () => {
      if (!S.cand.length) return;
      S.ci = (S.ci + 1) % S.cand.length;
      applySpot(S.cand[S.ci]);
      sizeOut(); render();
      note(S.cand.length > 1 ? `Spot ${S.ci + 1} of ${S.cand.length}. Drag it anywhere.` : "That is the best spot we found. Drag it anywhere.", 3500);
    });
    if (!onWall) {
      $("roomTurnL").addEventListener("click", () => { S.turn += Math.PI / 8; render(); });
      $("roomTurnR").addEventListener("click", () => { S.turn -= Math.PI / 8; render(); });
    }
    $("roomSmaller").addEventListener("click", () => { S.userSize = clamp(S.userSize / 1.06, 0.5, 2); sizeOut(); render(); });
    $("roomBigger").addEventListener("click", () => { S.userSize = clamp(S.userSize * 1.06, 0.5, 2); sizeOut(); render(); });
    $("roomSizeOut").addEventListener("click", () => { S.userSize = 1; sizeOut(); render(); });
    bar.querySelectorAll("[data-part]").forEach((b) => b.addEventListener("click", () => togglePart(b.dataset.part)));
    const eye = q("roomEye");
    const hide = () => eye.classList.add("hide");
    $("hcIn").addEventListener("input", (e) => { S.hc = +e.target.value; $("hcOut").textContent = `${S.hc.toFixed(2).replace(/0$/, "")} m`; render(); });
    $("yhIn").addEventListener("input", (e) => { S.yh = +e.target.value / 100; const v = +e.target.value; $("yhOut").textContent = v === 50 ? "middle" : v < 50 ? "higher" : "lower"; eye.classList.remove("hide"); render(); clearTimeout(hide.t); hide.t = setTimeout(hide, 1800); });
    $("yhIn").addEventListener("change", () => { S.cand = candidates(); });
    $("hcIn").addEventListener("change", () => { S.cand = candidates(); });
    if (onWall) $("wdIn").addEventListener("input", (e) => { S.wallDist = +e.target.value; S.userSize = 1; $("wdOut").textContent = `${S.wallDist.toFixed(1)} m`; render(); });
    $("lensIn")?.addEventListener("change", (e) => { S.lens = +e.target.value; S.cand = candidates(); render(); });
    $("roomSave").addEventListener("click", save);
    $("roomNew").addEventListener("click", () => { q("roomWork").classList.add("hide"); q("roomIntro").classList.remove("hide"); S.mv?.remove(); S.drag?.remove(); S.mv = null; });
  }
  function sizeOut() {
    const o = q("roomSizeOut");
    if (!o) return;
    const pct = Math.round(S.userSize * 100);
    o.textContent = pct === 100 ? "Real size" : `${pct}%`;
    if (onWall) q("wdOut") && (q("wdOut").textContent = `${S.wallDist.toFixed(1)} m`), q("wdIn") && (q("wdIn").value = S.wallDist);
  }

  async function togglePart(key) {
    if (S.busy) return;
    S.busy = true;
    const mv = S.mv;
    const sk = () => parts.map((p) => (S.open[p.key] ? 1 : 0)).join("");
    const from = sk();
    S.open[key] = !S.open[key];
    mv.animationName = `S${from}_${sk()}`;
    await mv.updateComplete;
    mv.currentTime = 0;
    mv.play({ repetitions: 1 });
    root.querySelectorAll("[data-part]").forEach((b) => {
      const p = parts.find((x) => x.key === b.dataset.part);
      b.setAttribute("aria-pressed", String(S.open[p.key]));
      b.querySelector("span").textContent = `${S.open[p.key] ? "Close" : "Open"} ${p.label}`;
    });
    setTimeout(() => (S.busy = false), 900);
  }

  // ── a picture to keep: the photo, the shadow and the product ──
  async function save() {
    const btn = q("roomSave");
    btn.disabled = true;
    try {
      const P = S.photo, p = pose(), r = rect();
      const c = document.createElement("canvas");
      c.width = P.w; c.height = P.h;
      const ctx = c.getContext("2d");
      ctx.drawImage(P.canvas, 0, 0);
      if (!onWall) { // shadow, as on screen
        const yBack = p.yh + (S.hc * p.f) / (p.dFront + Dm);
        const w = Wm * (p.f / (p.dFront + Dm / 2)) * 1.3, h = Math.max(8 / r.k, (S.yb - yBack) * 1.7);
        const cx = S.xb, cy = (S.yb + yBack) / 2;
        ctx.save();
        ctx.translate(cx, cy); ctx.scale(w / 2, h / 2);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, "rgba(0,0,0,.62)"); g.addColorStop(.55, "rgba(0,0,0,.34)"); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      const blob = await S.mv.toBlob({ mimeType: "image/png" });
      const bmp = await createImageBitmap(blob);
      if (onWall) ctx.filter = "drop-shadow(0px 5px 7px rgba(0,0,0,.35))";
      ctx.drawImage(bmp, p.xEl - p.Ew / 2, p.yEl - p.Eh / 2, p.Ew, p.Eh);
      ctx.filter = "none";
      const out = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.92));
      const name = `${product.model.replace(/[^A-Za-z0-9]+/g, "-")}-in-my-room.jpg`;
      const file = new File([out], name, { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: `${product.brand} ${product.shortName} in my room` }); btn.disabled = false; return; } catch (e) { if (e?.name === "AbortError") { btn.disabled = false; return; } }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(out); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast?.("Picture saved");
    } catch (e) {
      note("We could not save the picture. Try a screenshot instead.", 5000);
    }
    btn.disabled = false;
  }
}
