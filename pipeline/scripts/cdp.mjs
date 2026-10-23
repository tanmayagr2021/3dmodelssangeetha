// Minimal Chrome DevTools Protocol driver around Playwright's headless Chromium.
import { spawn } from "node:child_process";
import fs from "node:fs";

const BIN = "/Users/apple/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ port = 9444, profile, flags = [] } = {}) {
  const proc = spawn(BIN, [`--remote-debugging-port=${port}`, "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required", `--user-data-dir=${profile}`, ...flags, "about:blank"], { stdio: "ignore" });
  let page;
  for (let i = 0; i < 40 && !page; i++) {
    await sleep(250);
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const logs = [];
  const listeners = {};
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.method && listeners[m.method]) listeners[m.method].forEach((fn) => fn(m.params));
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.consoleAPICalled") logs.push(`[${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description).join(" "));
    if (m.method === "Runtime.exceptionThrown") logs.push("EXCEPTION " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") logs.push("LOG " + m.params.entry.text + " " + (m.params.entry.url || ""));
  };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Log.enable");
  const evalJS = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (r.result?.exceptionDetails) return { __error: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text };
    return r.result?.result?.value;
  };
  const shot = async (file, clip) => {
    const r = await send("Page.captureScreenshot", { format: file.endsWith(".jpg") ? "jpeg" : "png", quality: file.endsWith(".jpg") ? 86 : undefined, clip });
    fs.writeFileSync(file, Buffer.from(r.result.data, "base64"));
  };
  const viewport = (width, height, mobile = false, ua) => Promise.all([
    send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile }),
    ua ? send("Emulation.setUserAgentOverride", { userAgent: ua }) : null,
    send("Emulation.setTouchEmulationEnabled", { enabled: mobile }),
  ]);
  const go = async (url) => { await send("Page.navigate", { url }); await sleep(300); };
  const waitFor = async (expr, ms = 30000) => { for (let t = 0; t < ms; t += 250) { if (await evalJS(expr)) return true; await sleep(250); } return false; };
  const click = async (x, y) => {
    for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  };
  const close = () => { ws.close(); proc.kill(); };
  const on = (method, fn) => (listeners[method] ||= []).push(fn);
  return { send, evalJS, shot, viewport, go, waitFor, click, logs, close, on };
}
