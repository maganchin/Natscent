/* ------------------------------------------------------------------
   One scroll-driven effect: the smoke plume plays as the visitor
   scrolls past the hero, and its scrim recolors ivory → charcoal on
   reaching the contact section, the single atmosphere shift in the
   page. Everything else is static.

   The plume itself is a static body background-image by default
   (see base.css) — this is the always-present, zero-JS fallback.
   Motion-enabled visitors get that upgraded to real scroll-scrubbed
   playback via SmokeScrub (src/smoke.ts), which fades in as the
   hero's own photo background scrolls away.
   ------------------------------------------------------------------ */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SmokeScrub } from "./smoke";

gsap.registerPlugin(ScrollTrigger);

const SCRIM_DARK = "rgba(78, 64, 92, 0.86)";
const SCRIM_LIGHT = "rgba(245, 243, 238, 0.82)";

// The header is fixed and transparent by default (see base.css) so it
// floats over the hero photo with no flat color bar cutting across
// it. This flips it solid as soon as the hero has scrolled out from
// under it, so nav text stays legible over lighter sections below.
// Not gated behind reduced-motion: it's a discrete legibility state,
// not an animation.
export function initHeaderState(): void {
  const header = document.getElementById("site-header");
  const hero = document.getElementById("top");
  if (!header || !hero) return;

  const observer = new IntersectionObserver(
    ([entry]) => header.classList.toggle("site-header--solid", !entry.isIntersecting),
    { rootMargin: `-${header.offsetHeight}px 0px 0px 0px`, threshold: 0 },
  );
  observer.observe(hero);
}

export function initScrollNarrative(reduced: boolean): void {
  const body = document.body;

  // is-dark-zone drives the reduced-motion static scrim fallback +
  // focus outline color; active from the moment the contact section
  // enters until the page ends, off everywhere before that.
  ScrollTrigger.create({
    trigger: "#contact",
    start: "top 65%",
    end: "bottom bottom",
    onToggle: (self) => body.classList.toggle("is-dark-zone", self.isActive),
  });

  if (reduced) return;

  body.classList.add("has-motion");

  // Bottom of the photo dissolves first; as the visitor scrolls, the
  // transparent edge creeps upward so the next section reveals through
  // rather than the whole block fading at once.
  const ground = document.querySelector(".hero__ground");
  if (ground instanceof HTMLElement) {
    gsap.fromTo(
      ground,
      { "--fade-top": "100svh" },
      {
        "--fade-top": "8svh",
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.55,
        },
      },
    );
  }

  // proxy element used only so GSAP can interpolate the scrim color;
  // it's never painted (0×0, hidden) — each frame its computed color
  // is copied onto the --smoke-scrim custom property on <body>
  const scrimProxy = document.createElement("div");
  scrimProxy.style.cssText = "position:absolute; width:0; height:0; overflow:hidden; visibility:hidden;";
  scrimProxy.style.backgroundColor = SCRIM_LIGHT;
  body.appendChild(scrimProxy);

  gsap.to(scrimProxy, {
    backgroundColor: SCRIM_DARK,
    ease: "none",
    scrollTrigger: {
      trigger: "#contact",
      start: "top 65%",
      end: "top 15%",
      scrub: true,
    },
    onUpdate: () => {
      body.style.setProperty("--smoke-scrim", getComputedStyle(scrimProxy).backgroundColor);
    },
  });

  const smoke = new SmokeScrub();

  // fade the plume in as the hero's own photo scrolls out of view
  ScrollTrigger.create({
    trigger: "#creates",
    start: "top bottom",
    end: "top 55%",
    scrub: true,
    onUpdate: (self) => smoke.setOpacity(self.progress),
  });

  // scrub the plume's real frames from there through to the page bottom
  ScrollTrigger.create({
    trigger: "#creates",
    start: "top bottom",
    endTrigger: document.documentElement,
    end: "bottom bottom",
    onUpdate: (self) => smoke.setProgress(self.progress),
  });
}
