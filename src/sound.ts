/* ------------------------------------------------------------------
   Optional ambient bed. Off until the visitor turns it on — browsers
   also block unmuted autoplay, so a click is the honest start.
   A quiet D-major pentatonic pad + sparse tones, faded in/out.
   ------------------------------------------------------------------ */

const MASTER = 0.16;
const FADE_IN = 1.4;
const FADE_OUT = 0.7;

const DRONES: Array<{ freq: number; type: OscillatorType; gain: number; pan: number; detune: number }> = [
  { freq: 73.42, type: "sine", gain: 0.07, pan: 0, detune: 0 }, // D2
  { freq: 110.0, type: "sine", gain: 0.05, pan: -0.35, detune: -4 }, // A2
  { freq: 146.83, type: "triangle", gain: 0.018, pan: 0.4, detune: 3 }, // D3
  { freq: 220.0, type: "sine", gain: 0.022, pan: 0.15, detune: -6 }, // A3
];

const TONES = [293.66, 329.63, 369.99, 440.0, 493.88]; // D4 E4 F#4 A4 B4

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let melodyTimer = 0;
let playing = false;

function audioContext(): Ctx {
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new Ctor();
}

function connectPad(context: Ctx, dest: AudioNode, spec: (typeof DRONES)[number]): void {
  const osc = context.createOscillator();
  osc.type = spec.type;
  osc.frequency.value = spec.freq;
  osc.detune.value = spec.detune;

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 720;
  filter.Q.value = 0.55;

  const gain = context.createGain();
  gain.gain.value = spec.gain;

  const pan = context.createStereoPanner();
  pan.pan.value = spec.pan;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(pan);
  pan.connect(dest);
  osc.start();
}

function playTone(context: Ctx, dest: AudioNode): void {
  const freq = TONES[Math.floor(Math.random() * TONES.length)]!;
  const osc = context.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1400;

  const gain = context.createGain();
  const now = context.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.045, now + 2.2);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 9);

  const pan = context.createStereoPanner();
  pan.pan.value = Math.random() * 1.2 - 0.6;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(pan);
  pan.connect(dest);
  osc.start(now);
  osc.stop(now + 9.2);
}

function scheduleMelody(context: Ctx, dest: AudioNode): void {
  if (!playing) return;
  playTone(context, dest);
  const wait = 7000 + Math.random() * 8000;
  melodyTimer = window.setTimeout(() => scheduleMelody(context, dest), wait);
}

function fadeMaster(to: number, seconds: number): void {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(to, now + seconds);
}

async function start(): Promise<void> {
  if (playing) return;
  if (!ctx) {
    ctx = audioContext();
    master = ctx.createGain();
    master.gain.value = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1800;

    const delay = ctx.createDelay();
    delay.delayTime.value = 0.48;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.22;
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = "lowpass";
    delayFilter.frequency.value = 900;

    master.connect(filter);
    filter.connect(ctx.destination);
    filter.connect(delay);
    delay.connect(delayFilter);
    delayFilter.connect(delayGain);
    delayGain.connect(filter);

    for (const drone of DRONES) connectPad(ctx, master, drone);
  }

  await ctx.resume();
  playing = true;
  fadeMaster(MASTER, FADE_IN);
  window.clearTimeout(melodyTimer);
  melodyTimer = window.setTimeout(() => {
    if (ctx && master) scheduleMelody(ctx, master);
  }, 2500);
}

function stop(): void {
  if (!playing || !ctx || !master) return;
  playing = false;
  window.clearTimeout(melodyTimer);
  fadeMaster(0, FADE_OUT);
  window.setTimeout(() => {
    if (!playing) ctx?.suspend();
  }, FADE_OUT * 1000 + 50);
}

function syncButton(button: HTMLButtonElement, on: boolean): void {
  button.setAttribute("aria-pressed", on ? "true" : "false");
  button.setAttribute("aria-label", on ? "Turn off music" : "Play soothing music");
}

export function initSound(): void {
  const button = document.getElementById("sound-toggle") as HTMLButtonElement | null;
  if (!button) return;

  syncButton(button, false);

  button.addEventListener("click", () => {
    const next = !playing;
    if (next) {
      void start().then(() => {
        syncButton(button, true);
      });
    } else {
      stop();
      syncButton(button, false);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) {
      if (playing) void ctx.suspend();
    } else if (playing) {
      void ctx.resume();
    }
  });
}
