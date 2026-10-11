#!/usr/bin/env bash
# Creates the Next.js app, installs dependencies, and overlays this starter kit on top.
# Usage (from the folder where the project should live):  bash path/to/starter/scripts/bootstrap.sh
set -euo pipefail
STARTER="$(cd "$(dirname "$0")/.." && pwd)"
APP="gamified-task-manager"

npx create-next-app@latest "$APP" --typescript --tailwind --eslint --app --import-alias "@/*" --use-npm --yes
cd "$APP"
npm install @xyflow/react zustand @tanstack/react-query framer-motion lucide-react canvas-confetti @prisma/client
npm install -D prisma @types/canvas-confetti
npx prisma init            # creates prisma/ and .env; our schema replaces the generated one below

cp -R "$STARTER/README.md" "$STARTER/docs" "$STARTER/lib" "$STARTER/stores" "$STARTER/scripts" "$STARTER/.env.example" .
cp "$STARTER/prisma/schema.prisma" prisma/schema.prisma
npx prisma generate

git add -A
git commit -m "chore: scaffold Next.js app and add starter kit (schema, DAG engine, docs, prototypes)"
echo "Done. Next: fill in .env, then run: npx prisma migrate dev --name init_roadmap_schema"
