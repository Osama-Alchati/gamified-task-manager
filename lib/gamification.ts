export const TASK_XP = 10;
export const LEVEL_BOUNTY = 50;
export const BOSS_BOUNTY = 150;

/** Total XP needed to reach character level L. Early levels come fast, later ones slow down. Tune freely. */
export const xpForLevel = (L: number) => Math.round(40 * Math.pow(L - 1, 1.6));

export function levelFromXp(xp: number) {
  let L = 1;
  while (xp >= xpForLevel(L + 1)) L++;
  return L;
}

export function levelProgress(xp: number) {
  const L = levelFromXp(xp);
  const lo = xpForLevel(L);
  const hi = xpForLevel(L + 1);
  return { level: L, current: xp - lo, needed: hi - lo, ratio: (xp - lo) / (hi - lo) };
}

export const levelBounty = (l: { isBoss: boolean; xpBounty: number | null }) =>
  l.xpBounty ?? (l.isBoss ? BOSS_BOUNTY : LEVEL_BOUNTY);

/** Placeholder streak tiers. The spec asks for tiered bonuses but gives no numbers. */
export const streakMultiplier = (streak: number) =>
  streak >= 14 ? 1.5 : streak >= 7 ? 1.25 : streak >= 3 ? 1.1 : 1;

const dayKey = (d: Date, tzOffsetMin: number) =>
  Math.floor((d.getTime() - tzOffsetMin * 60_000) / 86_400_000);

/**
 * Streak after completing a task now. Pass the user's timezone offset in minutes
 * (JS `getTimezoneOffset()` value) so "a calendar day" matches theirs, not the server's.
 */
export function nextStreak(current: number, lastActiveAt: Date | null, now = new Date(), tzOffsetMin = 0) {
  if (!lastActiveAt) return { streak: 1, incremented: true };
  const diff = dayKey(now, tzOffsetMin) - dayKey(lastActiveAt, tzOffsetMin);
  if (diff <= 0) return { streak: Math.max(current, 1), incremented: false };
  if (diff === 1) return { streak: current + 1, incremented: true };
  return { streak: 1, incremented: true };
}
