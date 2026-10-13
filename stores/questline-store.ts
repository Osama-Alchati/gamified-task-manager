import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  applyToggle,
  createSeed,
  makeTask,
  pushLog,
  uid,
  wouldCreateCycleForLevels,
  type Level,
  type Priority,
  type QuestData,
  type Task,
  type TaskType,
  type ToggleResult,
  type World,
} from '@/lib/questline/engine';

interface Actions {
  setWorld: (id: string) => void;
  toggleTask: (levelId: string, taskId: string) => ToggleResult | null;
  addTask: (levelId: string, title: string, type: TaskType, p: Priority) => void;
  updateTask: (levelId: string, taskId: string, patch: Partial<Task>) => void;
  removeTask: (levelId: string, taskId: string) => void;
  updateLevel: (levelId: string, patch: Partial<Pick<Level, 'title' | 'icon' | 'xp' | 'boss'>>) => void;
  toggleDep: (levelId: string, depId: string) => void;
  moveLevel: (levelId: string, x: number, y: number) => void;
  addChild: (parentId: string) => string | null;
  removeLevel: (levelId: string) => void;
  toggleSound: () => void;
  resetAll: () => void;
}

/** Immutably patch one level of the current world. */
const patchLevel = (s: QuestData, levelId: string, fn: (l: Level) => Level): World[] =>
  s.worlds.map((w) =>
    w.id !== s.cur ? w : { ...w, levels: w.levels.map((l) => (l.id === levelId ? fn(l) : l)) },
  );

const dataOf = (s: QuestData): QuestData => ({
  worlds: s.worlds,
  cur: s.cur,
  streak: s.streak,
  last: s.last,
  days: s.days,
  log: s.log,
  sound: s.sound,
});

export const useQuestStore = create<QuestData & Actions>()(
  persist(
    (set, get) => ({
      ...createSeed(),

      setWorld: (id) => set({ cur: id }),

      toggleTask: (levelId, taskId) => {
        const draft = structuredClone(dataOf(get()));
        const result = applyToggle(draft, levelId, taskId);
        if (result) {
          set({
            worlds: draft.worlds,
            streak: draft.streak,
            last: draft.last,
            days: draft.days,
            log: draft.log,
          });
        }
        return result;
      },

      addTask: (levelId, title, type, p) => {
        const v = title.trim();
        if (!v) return;
        set((s) => ({
          worlds: patchLevel(s, levelId, (l) => ({ ...l, tasks: [...l.tasks, makeTask(v, type, p)] })),
          log: pushLog(s.log, `Added "${v}"`),
        }));
      },

      updateTask: (levelId, taskId, patch) =>
        set((s) => ({
          worlds: patchLevel(s, levelId, (l) => ({
            ...l,
            tasks: l.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
          })),
        })),

      removeTask: (levelId, taskId) =>
        set((s) => ({
          worlds: patchLevel(s, levelId, (l) => ({
            ...l,
            tasks: l.tasks.filter((t) => t.id !== taskId),
          })),
          log: pushLog(s.log, 'Removed a task'),
        })),

      updateLevel: (levelId, patch) =>
        set((s) => ({ worlds: patchLevel(s, levelId, (l) => ({ ...l, ...patch })) })),

      toggleDep: (levelId, depId) => {
        const s = get();
        const world = s.worlds.find((w) => w.id === s.cur);
        const level = world?.levels.find((l) => l.id === levelId);
        if (!world || !level) return;
        const hasDep = level.deps.includes(depId);
        if (!hasDep && wouldCreateCycleForLevels(world.levels, levelId, depId)) return;
        set({
          worlds: s.worlds.map((w) =>
            w.id !== s.cur
              ? w
              : {
                ...w,
                levels: w.levels.map((l) =>
                  l.id === levelId
                    ? { ...l, deps: hasDep ? l.deps.filter((d) => d !== depId) : [...l.deps, depId] }
                    : l,
                ),
              },
          ),
          log: pushLog(s.log, hasDep ? 'Removed prerequisite' : 'Added prerequisite'),
        });
      },

      moveLevel: (levelId, x, y) =>
        set((s) => ({ worlds: patchLevel(s, levelId, (l) => ({ ...l, x, y })) })),

      addChild: (parentId) => {
        const s = get();
        const world = s.worlds.find((w) => w.id === s.cur);
        const parent = world?.levels.find((l) => l.id === parentId);
        if (!world || !parent) return null;
        const k = world.levels.filter((l) => l.deps.includes(parentId)).length;
        const child: Level = {
          id: uid(),
          title: 'New level',
          deps: [parentId],
          boss: false,
          icon: '⚔️',
          xp: null,
          x: parent.x + (k ? (k % 2 ? 1 : -1) * 150 * Math.ceil(k / 2) : 0),
          y: parent.y + 120,
          tasks: [makeTask('First task')],
        };
        set({
          worlds: s.worlds.map((w) => (w.id === s.cur ? { ...w, levels: [...w.levels, child] } : w)),
          log: pushLog(s.log, 'Branched a new level from ' + parent.title),
        });
        return child.id;
      },
      removeLevel: (levelId) => {
        const s = get();
        const world = s.worlds.find((w) => w.id === s.cur);
        const gone = world?.levels.find((l) => l.id === levelId);
        if (!world || !gone || world.levels.length <= 1) return; // never delete the last level
        set({
          worlds: s.worlds.map((w) =>
            w.id !== s.cur
              ? w
              : {
                ...w,
                levels: w.levels
                  .filter((l) => l.id !== levelId)
                  // reconnect the children to the removed level's parents so the path stays unbroken
                  .map((l) =>
                    l.deps.includes(levelId)
                      ? { ...l, deps: [...new Set([...l.deps.filter((d) => d !== levelId), ...gone.deps])] }
                      : l,
                  ),
              },
          ),
          log: pushLog(s.log, `Removed ${gone.title}`),
        });
      },
      toggleSound: () => set((s) => ({ sound: !s.sound })),

      resetAll: () => set(createSeed()),
    }),
    {
      name: 'questline-v3',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => dataOf(s),
    },
  ),
);
