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

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());
