'use client';

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { isLevelDone, levelStatus, type Level, type World } from '@/lib/questline/engine';
import type { Viewport } from './useViewport';

interface Props {
  world: World;
  builder: boolean;
  sel: string | null;
  vp: Viewport;
  onOpen: (id: string) => void;
  onAddChild: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
}

const DECOR = { forest: ['🌲', '🌳'], desert: ['🌵', '🌴'], space: ['✨', '🪐'] } as const;

const curve = (a: Level, b: Level) =>
  `M${a.x} ${a.y} C${a.x} ${a.y + 70},${b.x} ${b.y - 70},${b.x} ${b.y}`;

type Gesture =
  | { pinch: true; d: number; k: number; vx: number; vy: number; mx: number; my: number }
  | {
      pinch: false;
      x: number;
      y: number;
      vx: number;
      vy: number;
      moved: number;
      tgt: Element | null;
      nodeId: string | null;
      lx: number;
      ly: number;
      finalX?: number;
      finalY?: number;
    };

export default function MapCanvas({ world, builder, sel, vp, onOpen, onAddChild, onRemove, onMove }: Props) {
  const { levels, theme } = world;
  const byId = (id: string) => levels.find((l) => l.id === id);

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const spaceDown = useRef(false);
  const latest = useRef({ world, builder, onOpen, onAddChild, onRemove, onMove });
  useEffect(() => {
    latest.current = { world, builder, onOpen, onAddChild, onRemove, onMove };
    vp.setElements(svgRef.current, gRef.current);
  });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const P = pointers.current;

    const move = (e: PointerEvent) => {
      const g = gesture.current;
      if (!P.has(e.pointerId) || !g) return;
      P.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const v = vp.view.current;
      if (g.pinch) {
        if (P.size < 2) return;
        const [a, b] = [...P.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const r = vp.size();
        const k = vp.clamp((g.k * d) / g.d);
        const px = (g.mx - r.left - g.vx) / g.k;
        const py = (g.my - r.top - g.vy) / g.k;
        vp.view.current = { k, x: mx - r.left - px * k, y: my - r.top - py * k };
        vp.apply();
        return;
      }
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      g.moved = Math.max(g.moved, Math.abs(dx) + Math.abs(dy));
      if (g.moved <= 5) return;
      if (g.nodeId) {
        // Buffer position — committed on pointerup to avoid per-pixel store writes
        g.finalX = Math.round(g.lx + dx / v.k);
        g.finalY = Math.round(g.ly + dy / v.k);
        // Visually move node via DOM
        const el = svgRef.current?.querySelector(`[data-id="${g.nodeId}"]`);
        if (el) {
          const ox = g.finalX - g.lx;
          const oy = g.finalY - g.ly;
          el.setAttribute('transform', `translate(${ox} ${oy})`);
        }
      } else {
        vp.view.current = { ...v, x: g.vx + dx, y: g.vy + dy };
        vp.apply();
      }
    };

    const up = (e: PointerEvent) => {
      if (!P.has(e.pointerId)) return;
      P.delete(e.pointerId);
      const g = gesture.current;
      if (!g) return;
      if (!g.pinch && g.moved <= 5 && g.tgt) {
        const plus = g.tgt.closest('.plus');
        const del = g.tgt.closest('.del');
        const node = g.tgt.closest('.node');
        if (del) latest.current.onRemove(del.getAttribute('data-id') ?? '');
        else if (plus) latest.current.onAddChild(plus.getAttribute('data-id') ?? '');
        else if (node) latest.current.onOpen(node.getAttribute('data-id') ?? '');
      }
      // Commit buffered node drag
      if (!g.pinch && g.nodeId && g.moved > 5 && g.finalX != null && g.finalY != null) {
        // Clear visual transform
        const el = svgRef.current?.querySelector(`[data-id="${g.nodeId}"]`);
        if (el) el.removeAttribute('transform');
        latest.current.onMove(g.nodeId, g.finalX, g.finalY);
      }
      if (!g.pinch || P.size < 2) gesture.current = null;
    };

    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = vp.size();
      const v = vp.view.current;
      const k = vp.clamp(v.k * (e.deltaY < 0 ? 1.1 : 0.91));
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      vp.view.current = { k, x: mx - ((mx - v.x) * k) / v.k, y: my - ((my - v.y) * k) / v.k };
      vp.apply();
    };

    const keydown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName ?? '')) {
        spaceDown.current = true;
        e.preventDefault();
      }
    };
    const keyup = (e: KeyboardEvent) => {
      if (e.key === ' ') spaceDown.current = false;
    };
    const blur = () => {
      spaceDown.current = false;
      pointers.current.clear();
      gesture.current = null;
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
      svg.removeEventListener('wheel', wheel);
    };
  }, [vp]);

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const P = pointers.current;
    P.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = vp.view.current;
    if (P.size >= 2) {
      const [a, b] = [...P.values()];
      gesture.current = {
        pinch: true,
        d: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        k: v.k,
        vx: v.x,
        vy: v.y,
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
      };
      return;
    }
    const target = e.target as Element;
    const nodeEl = target.closest('.node');
    // Don't start a drag when clicking the delete or add buttons
    const isActionBtn = !!(target.closest('.del') || target.closest('.plus'));
    const dragged =
      builder && !spaceDown.current && nodeEl && !isActionBtn ? byId(nodeEl.getAttribute('data-id') ?? '') : undefined;
    gesture.current = {
      pinch: false,
      x: e.clientX,
      y: e.clientY,
      vx: v.x,
      vy: v.y,
      moved: 0,
      tgt: target,
      nodeId: dragged?.id ?? null,
      lx: dragged?.x ?? 0,
      ly: dragged?.y ?? 0,
    };
  };

  const onNodeKey = (e: ReactKeyboardEvent<SVGGElement>, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onOpen(id);
    }
  };

  return (
    <svg ref={svgRef} className="map" aria-label="Roadmap overworld" onPointerDown={onPointerDown}>
      <defs>
        <pattern id="ql-dots" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.7" fill="#fff" opacity=".4" />
        </pattern>
      </defs>
      <g ref={gRef}>
        <rect x={-3000} y={-3000} width={6000} height={6000} fill="url(#ql-dots)" />

        {/* sky rings */}
        <g>
          {levels.flatMap((l) =>
            [190, 150, 118].map((r, j) => (
              <circle
                key={`ring-${l.id}-${r}`}
                cx={l.x}
                cy={l.y}
                r={r}
                fill="none"
                stroke="#fff"
                strokeOpacity={0.18 + j * 0.06}
                strokeWidth={2}
              />
            )),
          )}
        </g>

        {/* island bridges + island bodies */}
        <g>
          {levels.flatMap((l) =>
            l.deps.map((d) => {
              const a = byId(d);
              return a ? (
                <path
                  key={`bridge-${d}-${l.id}`}
                  d={curve(a, l)}
                  fill="none"
                  stroke="var(--isl)"
                  strokeWidth={92}
                  strokeLinecap="round"
                />
              ) : null;
            }),
          )}
          {levels.map((l) => (
            <circle
              key={`isl-${l.id}`}
              cx={l.x}
              cy={l.y}
              r={l.boss ? 112 : 96}
              fill="var(--isl)"
              stroke="var(--isl2)"
              strokeWidth={6}
            />
          ))}
        </g>

        {/* decor + stepping stones */}
        <g>
          {levels.map((l, i) => {
            const s = (i % 2 ? 1 : -1) * (92 + ((i * 13) % 24));
            return (
              <text
                key={`decor-${l.id}`}
                x={l.x + s}
                y={l.y + ((i * 17) % 50) - 18}
                fontSize={26}
                textAnchor="middle"
              >
                {DECOR[theme][i % 2]}
              </text>
            );
          })}
          {levels.flatMap((l) =>
            l.deps.map((d) => {
              const a = byId(d);
              if (!a) return null;
              const lit = isLevelDone(a);
              return (
                <path
                  key={`stone-${d}-${l.id}`}
                  className={'stone' + (lit ? ' lit' : '') + (lit && !isLevelDone(l) ? ' flow' : '')}
                  d={curve(a, l)}
                />
              );
            }),
          )}
        </g>

        {/* fog over locked levels */}
        <g>
          {levels.map((l) =>
            levelStatus(l, levels) === 'locked' ? (
              <g key={`cloud-${l.id}`} className="cloud">
                {(
                  [
                    [-34, 10, 44, 24],
                    [20, -12, 50, 28],
                    [42, 16, 38, 21],
                  ] as const
                ).map(([dx, dy, rx, ry]) => (
                  <ellipse
                    key={dx}
                    cx={l.x + dx}
                    cy={l.y + dy}
                    rx={rx}
                    ry={ry}
                    fill="#fff"
                    fillOpacity={0.82}
                  />
                ))}
              </g>
            ) : null,
          )}
        </g>

        {/* level nodes */}
        <g>
          {levels.map((l) => {
            const s = levelStatus(l, levels);
            const dn = l.tasks.filter((t) => t.done).length;
            const tot = l.tasks.length;
            const r = l.boss ? 44 : 34;
            const { x, y } = l;
            const fill =
              s === 'done' ? '#ffc83d' : s === 'active' ? (l.boss ? '#ff6b5b' : '#3fbf8f') : '#8d96a3';
            const ring = 2 * Math.PI * (r + 9);
            const label = s === 'locked' ? l.title : `${l.title}  ${dn}/${tot}`;
            const labelW = (() => {
              let w = 0;
              for (const ch of label) {
                const cp = ch.codePointAt(0) ?? 0;
                w += cp > 0x2e7f || (cp >= 0x1100 && cp <= 0x115f) || cp >= 0xfe00 ? 14 : 8;
              }
              return w + 24;
            })();
            const ly = y + r + 24;
            return (
              <g
                key={l.id}
                className={`node ${s}`}
                data-id={l.id}
                tabIndex={0}
                role="button"
                aria-label={`${l.title}, ${s}, ${dn} of ${tot} tasks`}
                onKeyDown={(e) => onNodeKey(e, l.id)}
              >
                <circle
                  className="sel-ring"
                  data-on={sel === l.id ? '' : undefined}
                  cx={x}
                  cy={y}
                  r={r + 20}
                  fill="none"
                  strokeWidth={4}
                  strokeDasharray="3 9"
                  strokeLinecap="round"
                />
                {l.boss && s !== 'locked' && (
                  <circle className="aura" cx={x} cy={y} r={r + 22} fill="#ffc83d" fillOpacity={0.32} />
                )}
                <circle cx={x} cy={y + 5} r={r} fill="#23304a" />
                <circle
                  className="body"
                  cx={x}
                  cy={y}
                  r={r}
                  fill={fill}
                  stroke={s === 'locked' ? '#5b6470' : '#23304a'}
                  strokeWidth={5}
                />
                {s === 'locked' && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r - 9}
                    fill="none"
                    stroke="#6f7885"
                    strokeWidth={3}
                    strokeDasharray="4 6"
                  />
                )}
                {s === 'active' && (
                  <>
                    <circle cx={x} cy={y} r={r + 9} fill="none" stroke="var(--line)" strokeWidth={7} />
                    <circle
                      cx={x}
                      cy={y}
                      r={r + 9}
                      fill="none"
                      stroke="#ffc83d"
                      strokeWidth={7}
                      strokeLinecap="round"
                      strokeDasharray={`${tot ? (ring * dn) / tot : 0} ${ring}`}
                      transform={`rotate(-90 ${x} ${y})`}
                    />
                  </>
                )}
                <text
                  x={x}
                  y={y + 9}
                  textAnchor="middle"
                  fontSize={l.boss ? 30 : 24}
                  opacity={s === 'locked' ? 0.4 : 1}
                >
                  {l.icon}
                </text>
                {s === 'locked' && (
                  <>
                    <circle cx={x + r * 0.78} cy={y - r * 0.78} r={12} fill="#23304a" />
                    <text x={x + r * 0.78} y={y - r * 0.78 + 5} textAnchor="middle" fontSize={13}>
                      🔒
                    </text>
                  </>
                )}
                {s === 'done' && (
                  <text x={x} y={y - r - (l.boss ? 30 : 10)} textAnchor="middle" fontSize={16}>
                    ⭐⭐⭐
                  </text>
                )}
                {l.boss && (
                  <text x={x} y={y - r - (s === 'done' ? 8 : 0) - 2} textAnchor="middle" fontSize={22}>
                    👑
                  </text>
                )}
                <rect
                  x={x - labelW / 2}
                  y={ly - 17}
                  width={labelW}
                  height={25}
                  rx={12}
                  fill="var(--panel)"
                  stroke="var(--ink)"
                  strokeWidth={2}
                  fillOpacity={0.94}
                />
                <text className="lbl" x={x} y={ly + 1}>
                  {label}
                </text>
                {builder && levels.length > 1 && (
                  <g
                    className="del"
                    data-id={l.id}
                    role="button"
                    tabIndex={0}
                    aria-label="Delete level"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove(l.id);
                      }
                    }}
                  >
                    <circle
                      cx={x - r * 0.8}
                      cy={y + r * 0.8}
                      r={13}
                      fill="#ff6b5b"
                      stroke="#23304a"
                      strokeWidth={3}
                    />
                    <text
                      x={x - r * 0.8}
                      y={y + r * 0.8 + 5}
                      textAnchor="middle"
                      fontSize={14}
                      fontWeight={800}
                      fill="#fff"
                    >
                      ✕
                    </text>
                  </g>
                )}
                {builder && (
                  <g
                    className="plus"
                    data-id={l.id}
                    role="button"
                    tabIndex={0}
                    aria-label="Add child level"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddChild(l.id);
                      }
                    }}
                  >
                    <circle
                      cx={x + r * 0.8}
                      cy={y + r * 0.8}
                      r={13}
                      fill="#3fbf8f"
                      stroke="#23304a"
                      strokeWidth={3}
                    />
                    <text
                      x={x + r * 0.8}
                      y={y + r * 0.8 + 6}
                      textAnchor="middle"
                      fontSize={18}
                      fontWeight={800}
                      fill="#fff"
                    >
                      +
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}