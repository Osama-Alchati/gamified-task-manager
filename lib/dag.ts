// Pure progression engine. No DB access: feed it rows, get statuses back, persist the diff in one transaction.
export type LevelStatus = "LOCKED" | "ACTIVE" | "COMPLETED";
/** Edge direction: `sourceLevelId` is a prerequisite of `targetLevelId`. */
export type Edge = { sourceLevelId: string; targetLevelId: string };

/** True if adding `edge` would create a cycle (a self-edge counts). */
export function wouldCreateCycle(edges: Edge[], edge: Edge): boolean {
  if (edge.sourceLevelId === edge.targetLevelId) return true;
  const out = new Map<string, string[]>();
  for (const e of edges) {
    const list = out.get(e.sourceLevelId) ?? [];
    list.push(e.targetLevelId);
    out.set(e.sourceLevelId, list);
  }
  // A cycle appears iff `target` can already reach `source`.
  const stack = [edge.targetLevelId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (id === edge.sourceLevelId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(out.get(id) ?? []));
  }
  return false;
}

/** A level is complete when it has at least one task and every task is done. */
export const isLevelComplete = (tasks: { isCompleted: boolean }[]) =>
  tasks.length > 0 && tasks.every((t) => t.isCompleted);

/** Derive every level's status from which levels are complete. */
export function computeStatuses(
  levelIds: string[],
  complete: Set<string>,
  edges: Edge[],
): Record<string, LevelStatus> {
  const prereqs = new Map<string, string[]>();
  for (const e of edges) {
    const list = prereqs.get(e.targetLevelId) ?? [];
    list.push(e.sourceLevelId);
    prereqs.set(e.targetLevelId, list);
  }
  const result: Record<string, LevelStatus> = {};
  for (const id of levelIds) {
    if (complete.has(id)) result[id] = "COMPLETED";
    else if ((prereqs.get(id) ?? []).every((p) => complete.has(p))) result[id] = "ACTIVE";
    else result[id] = "LOCKED";
  }
  return result;
}

/** Ids that moved LOCKED -> ACTIVE (drives the unlock animation and activity log). */
export const newlyUnlocked = (
  before: Record<string, LevelStatus>,
  after: Record<string, LevelStatus>,
) => Object.keys(after).filter((id) => before[id] === "LOCKED" && after[id] === "ACTIVE");
