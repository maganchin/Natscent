/* Visual QA helper: captures viewport screenshots of each section
   at a given viewport size. Usage:
     node scripts/shoot.mjs <width> <height> <outdir> [reduced]
*/
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const [w = "390", h = "844", outdir = "shots", reduced = ""] = process.argv.slice(2);
mkdirSync(outdir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--force-device-scale-factor=1"],
});

const page = await browser.newPage();
await page.setViewport({ width: Number(w), height: Number(h) });
if (reduced) {
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
}
await page.goto("http://localhost:5199", { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);

const anchors = ["top", "creates", "why-scent", "environments", "contact"];
for (const a of anchors) {
  await page.evaluate((id) => {
    document.getElementById(id).scrollIntoView({ behavior: "instant", block: "start" });
    window.scrollBy(0, -60);
  }, a);
  await new Promise((r) => setTimeout(r, 1400));
  await page.screenshot({ path: `${outdir}/${a}.png` });
}
// footer / very bottom
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: `${outdir}/footer.png` });

// horizontal overflow check
const overflow = await page.evaluate(() => {
  const bad = [];
  const vw = document.documentElement.clientWidth;
  document.querySelectorAll("body *").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 1 && (r.right > vw + 1 || r.left < -1)) {
      const cs = getComputedStyle(el);
      if (cs.position === "fixed") return; // atmosphere layers intentionally bleed
      bad.push(`${el.tagName}.${String(el.className).split(" ")[0]} right=${Math.round(r.right)} left=${Math.round(r.left)}`);
    }
  });
  return { vw, scrollW: document.documentElement.scrollWidth, bad: bad.slice(0, 12) };
});
console.log(JSON.stringify(overflow, null, 2));

await browser.close();
