/* ------------------------------------------------------------------
   Cursor scent-trail: as the pointer moves, ingredient photographs
   stamp themselves in random order and size, hold for a few seconds,
   then lift and fade. Pointer-events none so the page stays fully
   clickable. Gated off for reduced-motion and coarse pointers.
   ------------------------------------------------------------------ */

import { gsap } from "gsap";

type Stamp = {
  src: string;
  /** Knock out near-black grounds so smoke/powder float on the page. */
  knockout?: boolean;
};

const IMAGES: Stamp[] = [
  { src: "/trail/resin.jpg" },
  { src: "/trail/smoke.jpg", knockout: true },
  { src: "/trail/bloom.jpg", knockout: true },
  { src: "/trail/vanilla.jpg", knockout: true },
  { src: "/trail/oud.jpg" },
  { src: "/trail/powder.jpg", knockout: true },
  { src: "/trail/lilies.jpg" },
  { src: "/trail/orchid.jpg" },
  { src: "/trail/rose.jpg" },
  { src: "/trail/cinnamon.jpg" },
  { src: "/trail/spices.jpg" },
  { src: "/trail/lemons.jpg", knockout: true },
  { src: "/trail/coffee.jpg" },
  { src: "/trail/ginger.jpg" },
  { src: "/trail/citrus.jpg" },
];

const GAP = 52;
const MAX_LIVE = 22;
const SIZE_MIN = 22;
const SIZE_MAX = 108;
const HOLD = 0.55;

const SKIP = "input, textarea, select, [data-no-trail]";

function shuffle<T>(items: T[]): T[] {
  const deck = items.slice();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function start(): () => void {
  const rand = gsap.utils.random;
  let deck: Stamp[] = [];
  let last: Stamp | null = null;
  let lastX = Number.NaN;
  let lastY = Number.NaN;
  let live = 0;

  for (const image of IMAGES) {
    const preload = new Image();
    preload.decoding = "async";
    preload.src = image.src;
  }

  const nextStamp = (): Stamp => {
    if (deck.length === 0) {
      deck = shuffle(IMAGES);
      if (last && deck.length > 1 && deck[0] === last) {
        deck.push(deck.shift() as Stamp);
      }
    }
    last = deck.shift() as Stamp;
    return last;
  };

  const spawn = (x: number, y: number): void => {
    if (live >= MAX_LIVE) return;

    const image = nextStamp();
    const size = rand(SIZE_MIN, SIZE_MAX, 1);
    const rotation = rand(-12, 12);
    const jitterX = rand(-14, 14);
    const jitterY = rand(-12, 12);

    const el = document.createElement("figure");
    el.className = "scent-stamp" + (image.knockout ? " scent-stamp--knockout" : "");
    el.setAttribute("aria-hidden", "true");
    el.style.width = `${size}px`;

    const img = document.createElement("img");
    img.src = image.src;
    img.alt = "";
    img.draggable = false;
    el.appendChild(img);
    document.body.appendChild(el);
    live++;

    gsap.set(el, {
      left: x + jitterX,
      top: y + jitterY,
      xPercent: -50,
      yPercent: -50,
      rotation,
      scale: 0.78,
      autoAlpha: 0,
    });

    gsap.to(el, {
      scale: 1,
      autoAlpha: 1,
      duration: 0.16,
      ease: "power2.out",
    });

    gsap.to(el, {
      y: "-=10",
      autoAlpha: 0,
      scale: 0.94,
      duration: 0.28,
      delay: HOLD,
      ease: "power1.in",
      onComplete: () => {
        el.remove();
        live--;
      },
    });
  };

  const onMove = (event: PointerEvent): void => {
    if (event.pointerType !== "mouse") return;
    if ((event.target as Element | null)?.closest?.(SKIP)) return;

    const x = event.clientX;
    const y = event.clientY;
    if (Number.isNaN(lastX)) {
      lastX = x;
      lastY = y;
      return;
    }
    const dx = x - lastX;
    const dy = y - lastY;
    if (dx * dx + dy * dy < GAP * GAP) return;
    lastX = x;
    lastY = y;
    spawn(x, y);
  };

  window.addEventListener("pointermove", onMove, { passive: true });

  return () => {
    window.removeEventListener("pointermove", onMove);
    document.querySelectorAll(".scent-stamp").forEach((node) => {
      gsap.killTweensOf(node);
      node.remove();
    });
  };
}

export function initScentTrail(): void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fine = window.matchMedia("(pointer: fine)");
  let teardown: (() => void) | null = null;

  const sync = (): void => {
    teardown?.();
    teardown = null;
    if (!reduce.matches && fine.matches) teardown = start();
  };

  reduce.addEventListener("change", sync);
  fine.addEventListener("change", sync);
  sync();
}
