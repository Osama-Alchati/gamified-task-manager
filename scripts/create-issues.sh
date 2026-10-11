#!/usr/bin/env bash
# Creates the Phase 1 issues on the current repo. Requires the GitHub CLI: gh auth login
set -euo pipefail
gh label create phase-1 --color 3fbf8f --description "Foundation & MVP" 2>/dev/null || true
i() { gh issue create --label phase-1 --title "$1" --body "$2"; }

i "Scaffold Next.js 15 + TypeScript + Tailwind" "Run scripts/bootstrap.sh. Done when the dev server runs and lint passes."
i "Provision PostgreSQL and run the first Prisma migration" "Create a Supabase or Neon database, fill .env, run: npx prisma migrate dev --name init_roadmap_schema"
i "Auth.js OAuth sign-in (+ Prisma adapter models)" "GitHub OAuth, JWT sessions, add adapter models to prisma/schema.prisma, protect the (dashboard) routes."
i "World and Level CRUD (server actions)" "Create/rename/delete worlds and levels. Assign positions with lib/graph-layout.ts. Validate edges with wouldCreateCycle inside the transaction."
i "MapCanvas with XYFlow" "Custom LevelNode (locked/active/completed/boss), Bezier edges, onlyRenderVisibleElements, Center active + Zoom to fit controls."
i "Task drawer: create, toggle, delete" "Slide-over drawer on node click. Toggle recomputes statuses with computeStatuses and persists the diff in one transaction."
i "Unit tests for lib/dag.ts and lib/gamification.ts" "Cover cycle detection, auto-unlock, streak rollover across midnight and timezones, XP level thresholds."
