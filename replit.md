# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Study Platform (`artifacts/study-platform`)
- **Type**: React + Vite frontend-only app (no backend)
- **Preview path**: `/`
- **Description**: Distraction-free YouTube learning platform — "Nexus Study"
- **Data storage**: 100% localStorage (no server required)
- **Pages**:
  - `/` — Dashboard (stats, recent videos, today's tasks)
  - `/library` — Content Library (Subject → Topic → Subtopic → Videos hierarchy)
  - `/player/:videoId` — Distraction-free YouTube player with timestamp notes, speed control
  - `/notes` — Notes Hub (all notes across videos, searchable)
  - `/revision` — Revision Mode (Revise Later / Important queue)
  - `/playlists` — Playlist manager
  - `/files` — File Manager (PDFs, links, Drive folders, tags)
  - `/search` — Global search (videos, notes, topics)
  - `/planner` — Daily Study Planner with streak tracking
  - `/reminders` — Browser notification reminders
  - `/settings` — Theme, font size, data export/import/clear

- **Key files**:
  - `src/lib/types.ts` — all TypeScript interfaces + initial seed data
  - `src/hooks/use-local-storage.ts` — localStorage state hook
  - `src/components/theme-provider.tsx` — dark/light mode context
  - `src/components/layout/shell.tsx` — app shell with sidebar
  - `src/pages/player.tsx` — YouTube IFrame API integration

### API Server (`artifacts/api-server`)
- **Type**: Express API server
- **Preview path**: `/api`
- Currently only provides health check endpoint
