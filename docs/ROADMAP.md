# Roadmap

Source: the architecture spec (Oct 2026) plus the review of prototype v2.

## Phase 1 - Foundation & MVP
- [ ] Next.js 15 + TypeScript + Tailwind scaffold
- [ ] Prisma schema applied to PostgreSQL
- [ ] Auth.js OAuth sessions
- [ ] Basic XYFlow graph with linear nodes
- [ ] Task drawer: add, toggle, delete
- [ ] DAG validation and auto-unlock (`lib/dag.ts`)

## Phase 2 - Visual delight & ambient HUD
- [ ] Cartoon design tokens, SVG nodes with distinct states (stone / pulsing ring / gold / boss aura)
- [ ] Stepping-stone edges with animated flow toward the active level
- [ ] Terrain: dotted grid, contour rings, trees, fog-of-war clouds over locked levels
- [ ] Label pills for readability at any zoom
- [ ] Floating HUD: level, XP bar, streak, activity drawer
- [ ] TanStack Query optimistic mutations (checkbox flips in 0 ms, rolls back on error)

## Phase 3 - Gamification engine
- [ ] XP formula and level curve (`lib/gamification.ts`)
- [ ] Streak validation (timezone-aware) and 7/14-day heatmap
- [ ] Floating "+XP" indicator, confetti, optional 8-bit audio with mute
- [ ] Mobile: bottom-sheet drawer under 768 px, pinch zoom, two-finger pan
- [ ] Keyboard: F focus active, Esc close drawer, Space + drag pan

## Phase 4 - Scale & community
- [ ] Multi-world switcher and templates
- [ ] Offline-first service worker + IndexedDB cache
- [ ] Public roadmap sharing, theme packs
- [ ] Builder mode: drag nodes, branch with +, edit title/icon/XP, link existing levels (with cycle check)

## Task detail depth (anytime after Phase 1)
- [ ] Markdown notes with rendered links and sub-checklists
- [ ] Task type icons, due dates, time estimates

## Decisions and spec inconsistencies
- Spec entity `Map` is named `World` (matches the UI and `/worlds/[worldId]`).
- Spec uses both `sourceId/targetId` and `sourceLevelId/targetLevelId`; the schema uses the latter (matches the unique index).
- Level status is stored (per spec) but always derivable; recompute with `computeStatuses` and write the diff in one transaction.
- Streak bonus tiers are placeholders; the spec gives no numbers.
