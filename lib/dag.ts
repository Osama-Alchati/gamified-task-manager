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

/** Derive every level's status from which levels are complete (with transitive prereq checks, cycle protection, and memoization). */
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

  const memo = new Map<string, LevelStatus>();
  const visiting = new Set<string>();

  function resolve(id: string): LevelStatus {
    if (memo.has(id)) return memo.get(id)!;
    if (visiting.has(id)) return "LOCKED"; // cycle protection
    visiting.add(id);

    const parents = prereqs.get(id) ?? [];
    const allAncestorsComplete = parents.every((p) => resolve(p) === "COMPLETED");

    let status: LevelStatus;
    if (!allAncestorsComplete && parents.length > 0) {
      status = "LOCKED";
    } else if (complete.has(id)) {
      status = "COMPLETED";
    } else {
      status = "ACTIVE";
    }

    visiting.delete(id);
    memo.set(id, status);
    return status;
  }

  const result: Record<string, LevelStatus> = {};
  for (const id of levelIds) {
    result[id] = resolve(id);
  }
  return result;
}

/** Ids that moved LOCKED -> ACTIVE (drives the unlock animation and activity log). */
export const newlyUnlocked = (
  before: Record<string, LevelStatus>,
  after: Record<string, LevelStatus>,
) => Object.keys(after).filter((id) => before[id] === "LOCKED" && after[id] === "ACTIVE");
