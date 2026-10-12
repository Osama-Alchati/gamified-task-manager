/** Imperative effects (audio, confetti, floating XP). Client-only; call from event handlers. */

let ac: AudioContext | undefined;

function tone(enabled: boolean, freq: number, dur: number, delay = 0) {
  if (!enabled) return;
  try {
    ac = ac ?? new AudioContext();
    const o = ac.createOscillator();
    const g = ac.createGain();
    const start = ac.currentTime + delay;
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.04, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start(start);
    o.stop(start + dur);
  } catch {
    /* audio not available */
  }
}

export const chime = (enabled: boolean) => {
  tone(enabled, 660, 0.08);
  tone(enabled, 880, 0.12, 0.08);
};

export const fanfare = (enabled: boolean) =>
  [523, 659, 784, 1047].forEach((f, i) => tone(enabled, f, 0.18, i * 0.11));

const COLORS = ['#ffc83d', '#ff6b5b', '#3fbf8f', '#5aa9ff'];

export function confetti(x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) {
    const e = document.createElement('i');
    e.className = 'ql-cf';
    e.style.cssText = `left:${x}px;top:${y}px;background:${COLORS[i % 4]};--dx:${
      (Math.random() - 0.5) * 420
    }px;--dy:${Math.random() * 320 + 60}px`;
    document.body.appendChild(e);
    setTimeout(() => e.remove(), 1500);
  }
}

export function floatXp(text: string, from: { left: number; top: number }) {
  const target = document.getElementById('ql-xpbar');
  if (!target) return;
  const e = document.createElement('div');
  e.className = 'ql-fxp';
  e.textContent = text;
  e.style.left = from.left + 'px';
  e.style.top = from.top + 'px';
  document.body.appendChild(e);
  const b = target.getBoundingClientRect();
  e.animate(
    [
      { transform: 'translate(0,0)', opacity: 1 },
      {
        transform: `translate(${b.left - from.left}px,${b.top - from.top}px) scale(.6)`,
        opacity: 0,
      },
    ],
    { duration: 950, easing: 'ease-in' },
  ).onfinish = () => e.remove();
}
