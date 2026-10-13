/**
 * Questline game engine: pure TypeScript, no React, no browser APIs.
 * Level status is DERIVED from the DAG, it is never stored.
 */

export type TaskType = 'code' | 'design' | 'study' | 'habit';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Theme = 'forest' | 'desert' | 'space';
export type LevelStatus = 'done' | 'active' | 'locked';

export interface Task {
  id: string;
  t: string;
  type: TaskType;
  p: Priority;
  due: string; // YYYY-MM-DD or ''
  est: number | null; // minutes
  note: string;
  done: boolean;
  open: boolean; // details expanded in the drawer
}

export interface Level {
  id: string;
  title: string;
  deps: string[];
  boss: boolean;
  icon: string;
  xp: number | null; // null = default bounty
  x: number;
  y: number;
  tasks: Task[];
}

export interface World {
  id: string;
  name: string;
  theme: Theme;
  levels: Level[];
}

export interface QuestData {
  worlds: World[];
  cur: string;
  streak: number;
  last: string | null;
  days: Record<string, number>;
  log: string[];
  sound: boolean;
}

export const TASK_ICON: Record<TaskType, string> = {
  code: '💻',
  design: '🎨',
  study: '📚',
  habit: '⚡',
};
export const TASK_TYPES = Object.keys(TASK_ICON) as TaskType[];
export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

export const TASK_XP = 10;
export const LEVEL_BOUNTY = 50;
export const BOSS_BOUNTY = 150;

export const uid = () => crypto.randomUUID();

/** DST-safe local date shift: adds `n` calendar days without 864e5 ms arithmetic. */
export function shiftDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Locale-independent date key: 'YYYY-MM-DD' in local time. */
export const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const isoDay = (offsetDays: number) => toDateKey(shiftDays(new Date(), offsetDays));

export const makeTask = (
  t: string,
  type: TaskType = 'code',
  p: Priority = 'Medium',
  due = '',
  est: number | null = null,
): Task => ({ id: uid(), t, type, p, due, est, note: '', done: false, open: false });

/* ---------- DAG engine ---------- */

export const isLevelDone = (l: Level) => l.tasks.length > 0 && l.tasks.every((t) => t.done);

export function levelStatus(
  l: Level,
  levels: Level[],
  _memo?: Map<string, LevelStatus>,
  _seen?: Set<string>,
): LevelStatus {
  const memo = _memo ?? new Map<string, LevelStatus>();
  if (memo.has(l.id)) return memo.get(l.id)!;

  const seen = _seen ?? new Set<string>();
  if (seen.has(l.id)) return 'locked'; // cycle protection
  seen.add(l.id);

  const depsReady = l.deps.every((id) => {
    const d = levels.find((x) => x.id === id);
    return d ? levelStatus(d, levels, memo, seen) === 'done' : false;
  });

  let status: LevelStatus;
  if (!depsReady && l.deps.length > 0) {
    status = 'locked';
  } else if (isLevelDone(l)) {
    status = 'done';
  } else {
    status = 'active';
  }

  seen.delete(l.id);
  memo.set(l.id, status);
  return status;
}

/** True if making `depId` a prerequisite of `targetId` would create a cycle. */
export function wouldCreateCycleForLevels(
  levels: Level[],
  targetId: string,
  depId: string,
): boolean {
  if (targetId === depId) return true;
  // A cycle appears if targetId can already reach depId through existing deps.
  // i.e., depId transitively depends on targetId already.
  const stack = [depId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const level = levels.find((l) => l.id === id);
    if (!level) continue;
    for (const d of level.deps) {
      if (d === targetId) return true;
      stack.push(d);
    }
  }
  return false;
}

export const bounty = (l: Level) => l.xp ?? (l.boss ? BOSS_BOUNTY : LEVEL_BOUNTY);

export const totalXp = (worlds: World[]) =>
  worlds.reduce(
    (sum, w) =>
      sum +
      w.levels.reduce(
        (a, l) =>
          a + l.tasks.filter((t) => t.done).length * TASK_XP + (levelStatus(l, w.levels) === 'done' ? bounty(l) : 0),
        0,
      ),
    0,
  );

/** XP needed to REACH level L. */
export const threshold = (L: number) => Math.round(40 * Math.pow(L - 1, 1.6));
export const charLevel = (xp: number) => {
  let L = 1;
  while (xp >= threshold(L + 1)) L++;
  return L;
};

export const pushLog = (log: string[], msg: string) => [msg, ...log].slice(0, 20);

export interface ToggleResult {
  taskDone: boolean;
  cleared: { id: string; title: string; boss: boolean; bounty: number }[];
  unlocked: { id: string; title: string }[];
}

/** Mutates `data` (pass a clone). Returns what happened so the UI can celebrate. */
export function applyToggle(
  data: QuestData,
  levelId: string,
  taskId: string,
  now = new Date(),
): ToggleResult | null {
  const world = data.worlds.find((w) => w.id === data.cur);
  const level = world?.levels.find((l) => l.id === levelId);
  if (!world || !level) return null;
  const levels = world.levels;
  if (levelStatus(level, levels) === 'locked') return null;
  const task = level.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const before = Object.fromEntries(levels.map((l) => [l.id, levelStatus(l, levels)]));
  task.done = !task.done;

  const today = toDateKey(now);
  const yesterday = toDateKey(shiftDays(now, -1));

  if (task.done) {
    if (data.last !== today) {
      data.streak = data.last === yesterday ? data.streak + 1 : 1;
      data.last = today;
    }
    data.days[today] = (data.days[today] || 0) + 1;
    data.log = pushLog(data.log, `Cleared "${task.t}" (+${TASK_XP} XP)`);
  } else {
    // Reverse: decrement day count, recalculate streak
    if (data.days[today] != null) {
      data.days[today] = Math.max(0, data.days[today] - 1);
      if (data.days[today] === 0) delete data.days[today];
    }
    data.log = pushLog(data.log, `Unchecked "${task.t}"`);
  }

  const result: ToggleResult = { taskDone: task.done, cleared: [], unlocked: [] };
  for (const l of levels) {
    const after = levelStatus(l, levels);
    if (after === before[l.id]) continue;
    if (after === 'done') {
      data.log = pushLog(data.log, `${l.title} complete (+${bounty(l)} XP)`);
      result.cleared.push({ id: l.id, title: l.title, boss: l.boss, bounty: bounty(l) });
    } else if (after === 'active' && before[l.id] === 'locked') {
      data.log = pushLog(data.log, `${l.title} unlocked`);
      result.unlocked.push({ id: l.id, title: l.title });
    }
  }
  return result;
}

/* ---------- seed data ---------- */

type LevelSpec = [title: string, deps: number[], tasks: string[], boss?: boolean, icon?: string];

const pos = (i: number) => ({ x: Math.round(Math.sin(i * 0.8) * 160), y: i * 120 });
const SEED_PRIORITY: Priority[] = ['Medium', 'High', 'Low', 'Critical'];
const SEED_EST = [20, 30, 45, 60];

const makeWorld = (prefix: string, name: string, theme: Theme, specs: LevelSpec[]): World => ({
  id: uid(),
  name,
  theme,
  levels: specs.map(([title, deps, tasks, boss, icon], i) => ({
    id: `${prefix}-L${i}`,
    title,
    deps: deps.map((d) => `${prefix}-L${d}`),
    boss: !!boss,
    icon: boss ? '🏆' : (icon ?? '⚔️'),
    xp: null,
    ...pos(i),
    tasks: tasks.map((t, j) =>
      makeTask(
        t,
        TASK_TYPES[(i + j) % 4],
        SEED_PRIORITY[(i * 2 + j) % 4],
        i === 0 && j === 0 ? isoDay(1) : '',
        SEED_EST[(i + j) % 4],
      ),
    ),
  })),
});

export function createSeed(): QuestData {
  const worlds = [
    makeWorld('fs', 'Full-Stack Project', 'forest', [
      ['Boot camp', [], ['Run create-next-app', 'Write Prisma schema', 'Migrate the database']],
      ['First map', [0], ['Render XYFlow canvas', 'Build LevelNode']],
      ['Task drawer', [1], ['Slide-over drawer', 'Optimistic toggle']],
      ['HUD', [1], ['XP bar and streak', 'Activity feed']],
      ['Game loop', [2, 3], ['XP formula', 'DAG auto-unlock']],
      ['Mobile pass', [4], ['Pinch to zoom', 'Focus button']],
      ['Ship it', [5], ['Deploy', 'Invite 3 testers'], true],
    ]),
    makeWorld('lang', 'Language Learning', 'desert', [
      ['Alphabet', [], ['Learn letters', 'Daily 10-min drill']],
      ['Greetings', [0], ['20 core phrases', 'Record yourself']],
      ['Food and travel', [1], ['Menu vocabulary', 'Ask for directions']],
      ['Grammar core', [1], ['Present tense', 'Question words']],
      ['Conversations', [2, 3], ['Chat with a partner', 'Watch a short film']],
      ['Exam day', [4], ['Mock exam', 'Book the test'], true],
    ]),
    makeWorld('fit', 'Fitness Journey', 'space', [
      ['Baseline', [], ['Easy 3 km run', 'Log resting heart rate']],
      ['Base miles', [0], ['3 runs this week', 'Stretch routine']],
      ['Strength block', [0], ['Squat day', 'Core circuit']],
      ['Tempo work', [1, 2], ['Tempo 20 min', 'Hill repeats']],
      ['Race week', [3], ['Taper plan', 'Race day'], true],
    ]),
  ];
  return { worlds, cur: worlds[0].id, streak: 0, last: null, days: {}, log: [], sound: true };
}
