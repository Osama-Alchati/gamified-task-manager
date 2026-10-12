'use client';

// components/questline/QuestlineApp.tsx
// The shell: wires store + engine results to the map, HUD, drawer, toolbar, toast and effects.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { totalXp } from '@/lib/questline/engine';
import { chime, confetti, fanfare, floatXp } from '@/lib/questline/fx';
import { useQuestStore } from '@/stores/questline-store';
import Drawer from './Drawer';
import Hud from './Hud';
import MapCanvas from './MapCanvas';
import { useViewport } from './useViewport';
import './questline.css';

const noop = () => () => {};
/** false on the server and during hydration, true afterwards (persisted state is client-only). */
const useIsClient = () => useSyncExternalStore(noop, () => true, () => false);

export default function QuestlineApp({ fontClass = '' }: { fontClass?: string }) {
  const ready = useIsClient();
  const vp = useViewport();

  const worlds = useQuestStore((s) => s.worlds);
  const cur = useQuestStore((s) => s.cur);
  const streak = useQuestStore((s) => s.streak);
  const days = useQuestStore((s) => s.days);
  const log = useQuestStore((s) => s.log);
  const sound = useQuestStore((s) => s.sound);
  const { setWorld, toggleTask, addTask, updateTask, updateLevel, moveLevel, addChild, removeLevel, toggleSound, resetAll } =
    useQuestStore.getState();

  const [sel, setSel] = useState<string | null>(null);
  const [builder, setBuilder] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number>(0);

  const world = worlds.find((w) => w.id === cur) ?? worlds[0];
  const xp = useMemo(() => totalXp(worlds), [worlds]);
  const selected = world.levels.find((l) => l.id === sel) ?? null;

  const say = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 1900);
  }, []);

  /* first paint of the map: focus the active level */
  useEffect(() => {
    if (ready) vp.centerActive(world.levels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /* keep the active level centred on resize / rotation (debounced) */
  const levelsRef = useRef(world.levels);
  levelsRef.current = world.levels;
  useEffect(() => {
    let t = 0;
    const onResize = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => vp.centerActive(levelsRef.current), 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(t);
    };
  }, [vp]);

  /* Esc closes the drawer, F recentres */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName);
      if (e.key === 'Escape') setSel(null);
      if (typing) return;
      if (e.key === 'f' || e.key === 'F') vp.centerActive(levelsRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [vp]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  /* ---------- handlers ---------- */

  const onToggle = (levelId: string, taskId: string, checkbox: HTMLInputElement) => {
    const from = checkbox.getBoundingClientRect();
    const res = toggleTask(levelId, taskId);
    if (!res) return;

    if (res.taskDone) {
      chime(sound);
      floatXp('+10 XP', from);
    }
    for (const c of res.cleared) {
      const lvl = world.levels.find((l) => l.id === c.id);
      if (lvl) {
        const p = vp.screenOf(lvl);
        confetti(p.x, p.y, c.boss ? 90 : 45);
      }
      fanfare(sound);
      window.setTimeout(() => floatXp(`+${c.bounty} XP`, from), 350);
    }
    if (res.cleared.length) say(res.cleared.some((c) => c.boss) ? 'Boss defeated!' : 'Level cleared!');
    else if (res.unlocked.length) say('Unlocked: ' + res.unlocked.map((u) => u.title).join(', '));
  };

  const onWorld = (id: string) => {
    setWorld(id);
    setSel(null);
    const next = useQuestStore.getState().worlds.find((w) => w.id === id);
    if (next) requestAnimationFrame(() => vp.fit(next.levels));
  };

  const onAddChild = (parentId: string) => {
    const id = addChild(parentId);
    if (id) setSel(id);
  };

  const onReset = () => {
    if (!window.confirm('Reset all worlds, XP and streak? This cannot be undone.')) return;
    resetAll();
    setSel(null);
    requestAnimationFrame(() => {
      const w = useQuestStore.getState();
      vp.centerActive(w.worlds.find((x) => x.id === w.cur)?.levels ?? []);
    });
  };

  const toggleBuilder = () => {
    const next = !builder;
    setBuilder(next);
    say(next ? 'Builder: drag nodes, tap + to branch' : 'Builder off');
  };

  if (!ready) return <div className={`ql ${fontClass}`} data-w="forest" />;

  return (
    <div className={`ql ${fontClass}${builder ? ' bld' : ''}`} data-w={world.theme}>
      <MapCanvas
        world={world}
        builder={builder}
        vp={vp}
        onOpen={setSel}
        onAddChild={onAddChild}
        onMove={moveLevel}
      />

      <Hud
        worlds={worlds}
        cur={world.id}
        xp={xp}
        streak={streak}
        days={days}
        onWorld={onWorld}
      />

      <div className="tools">
        <button onClick={() => vp.centerActive(world.levels)}>Center active level</button>
        <button onClick={() => vp.fit(world.levels)}>Zoom to fit</button>
        <button className={builder ? 'on' : ''} aria-pressed={builder} onClick={toggleBuilder}>
          Builder mode
        </button>
        <button
          onClick={() => {
            toggleSound();
            chime(!sound); // plays only when the new state is "on"
          }}
        >
          {sound ? '🔊 Sound on' : '🔇 Muted'}
        </button>
        <button onClick={onReset}>Reset</button>
      </div>

      <div className="log" aria-live="polite">
        {log.length ? log.slice(0, 3).map((m, i) => <div key={i + m}>{m}</div>) : <div>No activity yet. Open the glowing level.</div>}
      </div>

      <Drawer
        level={selected}
        levels={world.levels}
        builder={builder}
        onClose={() => setSel(null)}
        onToggle={onToggle}
        onAddTask={addTask}
        onUpdateTask={updateTask}
        onUpdateLevel={updateLevel}
      />

      <div className="toast" role="status" data-on={toast ? '' : undefined}>
        {toast}
      </div>
    </div>
  );
}
