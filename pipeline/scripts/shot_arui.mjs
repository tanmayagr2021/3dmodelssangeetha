// Previews the Android in-AR controls by showing them over the 3D view.
import { launch, sleep } from "./cdp.mjs";
const [base, out] = process.argv.slice(2);
const b = await launch({ profile: `${out}/prof2`, port: 9456 });
await b.viewport(390, 844, true, "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36");
for (const id of ["godrej-rt-eonvogue-280c", "godrej-sic-18vtc3-wyb"]) {
  await b.go(`${base}/p/${id}`);
  await b.waitFor("document.querySelector('model-viewer')?.loaded === true", 40000);
  await sleep(1200);
  await b.evalJS(`(() => { const s = document.getElementById('stage'); s.style.height = '844px'; window.scrollTo(0, 56);
    document.getElementById('arUi').classList.remove('hide'); const st = document.getElementById('arStatus'); st.textContent = 'Real size · Drag to move · Twist to turn';
    document.querySelector('.controls').style.display = 'none'; document.getElementById('parts').style.display = 'none'; document.getElementById('hint').style.display = 'none'; document.getElementById('arBox').style.display = 'none'; })()`);
  await sleep(800);
  await b.shot(`${out}/arui-${id}.png`);
  await b.go(`${base}/p/${id}`);
  await b.waitFor("document.querySelector('model-viewer')?.loaded === true", 40000);
  await sleep(1500);
  await b.shot(`${out}/page-${id}.png`);
}
console.log(b.logs.filter((l) => /EXCEPTION|LOG |\[error\]/.test(l)).join("\n") || "no errors");
b.close();
