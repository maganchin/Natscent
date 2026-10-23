import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/sections.css";

import { initScrollNarrative, initHeaderState } from "./scroll";
import { initContactForm } from "./form";
import { initScentTrail } from "./trail";
import { initSound } from "./sound";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

initHeaderState();
initScrollNarrative(reduced);
initContactForm();
initScentTrail();
initSound();

const entries = document.querySelectorAll<HTMLElement>(".testimonial");
if (!reduced && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (items) => items.forEach((it) => { if (it.isIntersecting) { it.target.classList.add("is-in"); io.unobserve(it.target); } }),
    { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
  );
  entries.forEach((el) => io.observe(el));
}

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());
