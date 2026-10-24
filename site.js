// Shared by the product, compare and showroom pages (and xr.js): which moving part a tap
// landed on, which feature hotspots show in the current door state, and the fit check.

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const cm = (s) => parseFloat(s);

export const CATEGORIES = [
  ["Refrigerator", "Refrigerators"],
  ["Washing machine", "Washing machines"],
  ["Air conditioner", "Air conditioners"],
];

// Each part carries its bounding box closed and open (`zone`, written by the builders).
// A tap inside a box picks that part; where boxes overlap the smallest wins (a flap
// inside a door). A tap just off every box picks the nearest; a tap on the cabinet's
// side picks the part at that height and width, as seen from the front.
export function partAt(product, state, point) {
  const parts = (product.parts || []).filter((x) => x.zone);
  if (!parts.length) return product.parts?.[0]?.key ?? null;
  const p = [point.x, point.y, point.z];
  const box = (x) => x.zone[state[x.key] ? "open" : "closed"];
  const vol = ([a, b]) => (b[0] - a[0]) * (b[1] - a[1]) * (b[2] - a[2]);
  const dist = ([a, b], axes = [0, 1, 2]) => Math.hypot(...axes.map((i) => Math.max(a[i] - p[i], 0, p[i] - b[i])));
  const inside = parts.filter((x) => dist(box(x)) <= 0.01).sort((a, b) => vol(box(a)) - vol(box(b)));
  if (inside.length) return inside[0].key;
  const near = parts.map((x) => [x, dist(box(x))]).sort((a, b) => a[1] - b[1])[0];
  if (near[1] <= 0.06) return near[0].key;
  const front = parts.filter((x) => dist(x.zone.closed, [0, 1]) <= 0.01);
  return front.length ? front.sort((a, b) => vol(a.zone.closed) - vol(b.zone.closed))[0].key : null;
}

// show: "always", "<key>" (only while that part is open), "!<key>" (only while it is closed)
export function hotspotShown(h, state) {
  const s = h.show || "always";
  if (s === "always") return true;
  return s.startsWith("!") ? !state[s.slice(1)] : !!state[s];
}

// Will it fit? `space` is what the shopper measured, in cm: {w, h, d} for a floor unit,
// {w, h} (free wall width and height) for a wall unit. Gaps come from the maker (`fit`).
export function fitCheck(product, space) {
  const f = product.fit || {};
  const sides = f.sides || 0, top = f.top || 0, back = f.back || 0;
  const wall = product.placement === "wall";
  const dims = [
    { key: "w", label: "Width", size: cm(product.size.w), gap: sides * 2, gapText: sides ? `${sides} cm each side` : "" },
    { key: "h", label: "Height", size: cm(product.size.h), gap: top, gapText: top ? `${top} cm ${wall ? "below the ceiling" : "above"}` : "" },
  ];
  if (!wall) dims.push({ key: "d", label: "Depth", size: cm(product.size.d), gap: back, gapText: back ? `${back} cm behind` : "" });
  const rows = dims.map((d) => {
    const need = round(d.size + d.gap), have = +space[d.key];
    return { ...d, need, have, ok: have >= need, margin: round(have - need), given: have > 0 };
  });
  const given = rows.every((r) => r.given);
  return { rows, given, ok: given && rows.every((r) => r.ok), front: f.front || 0, note: f.note || "", gaps: !!(sides || top || back) };
}
const round = (n) => Math.round(n * 10) / 10;
