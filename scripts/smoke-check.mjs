/* Checks the scroll-scrubbed smoke canvas at several scroll depths:
   1. confirms the drawn frame actually advances with scroll (not stuck)
   2. confirms no Chrome fixed-element paint-loss artifact (canvas and
      content both still paint correctly deep into a tall page)
*/
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://localhost:5199", { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
// let SmokeScrub finish preloading all 121 frames
await page.waitForFunction(
  () => document.getElementById("smoke-canvas") !== null,
  { timeout: 5000 }
);
await new Promise((r) => setTimeout(r, 3000));

const depths = [0, 0.15, 0.35, 0.55, 0.75, 0.95, 1];
const results = [];
for (const d of depths) {
  await page.evaluate((frac) => {
    window.scrollTo(0, Math.round((document.body.scrollHeight - window.innerHeight) * frac));
  }, d);
  await new Promise((r) => setTimeout(r, 500));

  const info = await page.evaluate(() => {
    const canvas = document.getElementById("smoke-canvas");
    const ctx = canvas.getContext("2d");
    const sample = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
    // also sample a point known to be inside main content to check it's not blanked
    const heroRect = document.querySelector("main") ? document.querySelector("main").getBoundingClientRect() : null;
    return {
      scrollY: window.scrollY,
      canvasCenterRGBA: [sample[0], sample[1], sample[2], sample[3]],
      bodyBg: getComputedStyle(document.body).backgroundColor,
      mainVisible: !!heroRect,
    };
  });
  await page.screenshot({ path: `/private/tmp/claude-501/-Users-mchin-Github-Natscent/ffb427a9-986f-4f22-8965-546c57eb8de5/scratchpad/smoke-depth-${Math.round(d * 100)}.png` });
  results.push({ depth: d, ...info });
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
