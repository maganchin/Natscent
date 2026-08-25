/* ------------------------------------------------------------------
   Scroll-scrubbed smoke: the plume video (121 frames, extracted to
   individual WebP stills so scrubbing is instant seeking rather than
   real <video> currentTime, which is too slow/janky to feel tied to
   the scrollbar) is drawn frame-by-frame onto a fixed canvas as the
   visitor scrolls the whole page, top to bottom.

   This replaces the static body background-image with the real
   animation for motion-enabled visitors. Reduced-motion visitors
   never see this module at all — they keep the plain static
   background-image already set on body in base.css, which stays
   the always-present fallback underneath.
   ------------------------------------------------------------------ */

const FRAME_COUNT = 121;
const FRAME_PATH = (n: number) => `/smoke-frames/f${String(n).padStart(3, "0")}.webp`;

export class SmokeScrub {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scrim: HTMLDivElement;
  private frames: HTMLImageElement[] = [];
  private ready = false;
  private lastDrawn = -1;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.id = "smoke-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(this.canvas);

    this.scrim = document.createElement("div");
    this.scrim.id = "smoke-scrim";
    this.scrim.setAttribute("aria-hidden", "true");
    document.body.appendChild(this.scrim);

    // hidden until the hero photo scrolls away — see setOpacity
    this.canvas.style.opacity = "0";
    this.scrim.style.opacity = "0";

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;

    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.preload();
  }

  private preload(): void {
    let loaded = 0;
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        loaded++;
        if (loaded === FRAME_COUNT) {
          this.ready = true;
          this.draw(this.lastDrawn === -1 ? 1 : this.lastDrawn);
        }
      };
      img.src = FRAME_PATH(i);
      this.frames.push(img);
    }
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(window.innerWidth * this.dpr);
    this.canvas.height = Math.round(window.innerHeight * this.dpr);
    // setting width/height resets all 2d context state, so re-apply every resize
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
    if (this.lastDrawn > 0) this.draw(this.lastDrawn);
  }

  private draw(frameNumber: number): void {
    const img = this.frames[frameNumber - 1];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, dx, dy, dw, dh);
    this.lastDrawn = frameNumber;
  }

  /** progress: 0..1 across the scrubbed range (hero's end to page bottom). */
  setProgress(progress: number): void {
    if (!this.ready) return;
    const frameNumber = Math.min(FRAME_COUNT, Math.max(1, Math.round(progress * (FRAME_COUNT - 1)) + 1));
    if (frameNumber !== this.lastDrawn) this.draw(frameNumber);
  }

  /** 0..1 fade as the hero photo scrolls away and the plume takes over. */
  setOpacity(v: number): void {
    const clamped = Math.min(1, Math.max(0, v));
    this.canvas.style.opacity = String(clamped);
    this.scrim.style.opacity = String(clamped);
  }
}
