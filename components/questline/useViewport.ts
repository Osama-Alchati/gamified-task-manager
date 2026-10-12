import { useMemo, useRef, type RefObject } from 'react';
import { levelStatus, type Level } from '@/lib/questline/engine';

export interface Viewport {
  svgRef: RefObject<SVGSVGElement | null>;
  gRef: RefObject<SVGGElement | null>;
  view: RefObject<{ x: number; y: number; k: number }>;
  apply: () => void;
  size: () => DOMRect;
  clamp: (k: number) => number;
  focus: (l: Level, k?: number) => void;
  fit: (levels: Level[]) => void;
  centerActive: (levels: Level[]) => void;
  screenOf: (l: Level) => { x: number; y: number };
}

/**
 * Pan/zoom lives outside React state on purpose: updating a ref and one SVG attribute
 * is far cheaper than re-rendering the whole map on every pointer move.
 */
export function useViewport(): Viewport {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const view = useRef({ x: 0, y: 0, k: 1 });

  return useMemo<Viewport>(() => {
    const size = () => svgRef.current?.getBoundingClientRect() ?? new DOMRect(0, 0, 800, 600);
    const clamp = (k: number) => Math.max(0.35, Math.min(2.2, k));
    const apply = () => {
      const v = view.current;
      gRef.current?.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.k})`);
    };
    const focus = (l: Level, k = 1) => {
      const r = size();
      view.current = { k, x: r.width / 2 - l.x * k, y: r.height / 2 - l.y * k };
      apply();
    };
    const fit = (levels: Level[]) => {
      if (!levels.length) return;
      const r = size();
      const xs = levels.map((l) => l.x);
      const ys = levels.map((l) => l.y);
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      const y0 = Math.min(...ys);
      const y1 = Math.max(...ys);
      const k = clamp(Math.min(1.2, (r.width - 40) / (x1 - x0 + 320), (r.height - 170) / (y1 - y0 + 260)));
      view.current = {
        k,
        x: r.width / 2 - ((x0 + x1) / 2) * k,
        y: r.height / 2 - ((y0 + y1) / 2) * k + 20,
      };
      apply();
    };
    const centerActive = (levels: Level[]) => {
      if (!levels.length) return;
      const l = levels.find((x) => levelStatus(x, levels) === 'active') ?? levels[levels.length - 1];
      focus(l);
    };
    const screenOf = (l: Level) => {
      const r = size();
      const v = view.current;
      return { x: r.left + v.x + l.x * v.k, y: r.top + v.y + l.y * v.k };
    };
    return { svgRef, gRef, view, apply, size, clamp, focus, fit, centerActive, screenOf };
  }, []);
}
