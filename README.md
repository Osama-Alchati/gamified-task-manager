# Gamified Task Manager

A task manager where your roadmap is a cartoon overworld. Milestones are levels on a map, daily tasks live inside them, and clearing a level earns XP and unlocks the next ones.

**Status:** pre-Phase 1. Two clickable prototypes live in [`docs/prototypes/`](docs/prototypes) (open the HTML files in a browser). The real app starts from them.

## Stack
Next.js 15 (App Router), React 19, TypeScript, Tailwind, shadcn/ui, XYFlow (`@xyflow/react`), Zustand, TanStack Query v5, Framer Motion, PostgreSQL (Supabase or Neon), Prisma, Auth.js.

## Get started
Prerequisites: Node 20+, git, a PostgreSQL database, and optionally the [GitHub CLI](https://cli.github.com/).

```bash
# 1. Create the app and overlay this starter kit
bash scripts/bootstrap.sh

# 2. Configure and migrate
cd gamified-task-manager
cp .env.example .env            # fill in DATABASE_URL, DIRECT_URL, AUTH_*
npx prisma migrate dev --name init_roadmap_schema

# 3. Publish to GitHub and open the Phase 1 issues
gh repo create Osama-Alchati/gamified-task-manager --public --source=. --remote=origin --push
bash scripts/create-issues.sh

# 4. Run
npm run dev
```

If `prisma init` prints a different generator or config layout for your Prisma version, follow its output and keep the models from `prisma/schema.prisma`.

## What is already here
| Path | Purpose |
|---|---|
| `prisma/schema.prisma` | Users, worlds, levels, dependency edges, tasks, activity log, and the spec's indexes |
| `lib/dag.ts` | Cycle check, level completion, status derivation, newly unlocked levels (pure functions) |
| `lib/gamification.ts` | XP curve, level progress, bounties, timezone-aware streaks |
| `lib/graph-layout.ts` | Sinusoidal snake layout from the spec |
| `stores/useMapStore.ts` | Zustand store for selection, builder mode, sound |
| `docs/ROADMAP.md` | Phased checklist, backlog from the prototype review, spec decisions |
| `docs/prototypes/` | Prototype v1 (core loop) and v2 (visuals, builder, worlds, audio, mobile sheet) |

## Planned layout
```
app/(auth)/login, app/(dashboard)/worlds/[worldId]
components/map (MapCanvas, LevelNode, AnimatedPathEdge, MapControls)
components/hud (StatusHeader, RecentActivityDrawer)
components/drawer (TaskDrawer, TaskItem)
```

## Conventions
- Keep camera state out of business state: pan/zoom never re-renders task lists or hits the database.
- Task toggles are optimistic; roll back with a toast on failure.
- Anything that changes the graph validates it with `wouldCreateCycle` inside the same transaction.
