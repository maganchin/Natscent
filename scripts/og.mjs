/* Generates public/og.png (1200x630) from the live hero. */
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630 });
await page.goto("http://localhost:5199", { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
// let the entrance finish and the atmosphere settle with some warmth
await page.evaluate(() => window.scrollTo(0, 1));
await new Promise((r) => setTimeout(r, 2600));
await page.evaluate(() => {
  const cue = document.querySelector(".hero__scroll-cue");
  if (cue) cue.style.display = "none";
});
await page.screenshot({ path: "public/og.png" });
await browser.close();
console.log("public/og.png written");
