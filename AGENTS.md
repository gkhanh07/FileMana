# AGENTS.md

Internal workspace and project management app for ~10 people (developers, designers, 1–2 managers), used daily on desktop.

## Source of Truth

- Features: `docs/requirements.md`. Every requirement has an ID (`FR-TASK-04`, `NFR-06`) and a priority: MVP, Phase 2 or Later.
- Look and feel: design tokens in `frontend/app/globals.css`. `design/` holds reference mockups only; take ideas from it, not exact values.
- Current phase: **MVP**. Build only MVP requirements unless told otherwise.
- Reference requirement IDs in commits and PRs.
- If a request conflicts with the spec, point it out and ask. If the spec is silent, ask; do not invent behavior.

## Repo Layout

```
frontend/   Next.js app (app/, components/, lib/)
backend/    NestJS API (src/modules/<feature>/, src/common/, src/config/, prisma/)
docs/       requirements.md
design/     reference mockups only (*.dc.html, _ds/); not a source of truth
```

## Stack

- Frontend: Next.js (App Router), TypeScript strict, Tailwind CSS, shadcn/ui, Lucide, Barlow / Barlow Condensed
- Backend: NestJS, TypeScript strict
- Database: PostgreSQL with Prisma
- File storage: local disk on the server (a directory mounted as a Docker volume). No object storage service.
- Local environment: Docker Compose
- Runtime: Node 24 (`engines >=24.9`). On Windows put the Node 24 folder ahead of `C:\Program Files\nodejs` on `PATH` if `node -v` still shows 22.

Approved libraries (installed):

- Frontend: shadcn/ui (`radix-nova` style; brings `radix-ui`, `cn`, `class-variance-authority`, `tw-animate-css`), `lucide-react`, `sonner` (toasts), `next-themes` (theme), `@tanstack/react-query` (server state, optimistic updates), `openapi-typescript` (dev: API types), `vitest` (unit tests), `@playwright/test` (browser smoke tests)
- Backend: `prisma` + `@prisma/client` + `@prisma/adapter-pg` + `pg`, `@nestjs/config`, `class-validator`, `class-transformer`, `helmet`, `cookie-parser`, `argon2`, `@nestjs/throttler`, `@nestjs/schedule`, `@nestjs/swagger` (v11, since v12 needs Nest 12; only used to generate `openapi.json`)

Approved when the feature arrives: `cmdk` (via `shadcn add command`), `@dnd-kit/core` + `@dnd-kit/sortable`, `@tanstack/react-virtual` (only if NFR-03 fails). Still undecided: editor (Tiptap or BlockNote), email (`nodemailer` + provider).

Use built-ins instead of: date libraries (`Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`), logging libraries (Nest `ConsoleLogger` with `json: true`), `@nestjs/terminus` (plain `GET /health`), WebSockets/Redis (`@Sse()` + rxjs `Subject`), Passport/JWT (session table + guard).

## Architecture

- Next.js is UI only. Server Components fetch the NestJS API (forwarding the session cookie); client components call the NestJS API for mutations. No business logic or permission checks in Next.js.
- NestJS is the only place that checks auth and permissions.
- Task lists (a project's tasks, My Tasks, Home) load all matching tasks in one request; grouping, filtering and counts run on the client. Other lists (notifications, activity, files, Trash, the Done column's "See all") are paginated.

## Commands

Run from the folder shown.

| Task | `frontend/` | `backend/` |
| --- | --- | --- |
| Install | `npm install` | `npm install` |
| Dev | `npm run dev` | `npm run dev` |
| Build | `npm run build` | `npm run build` |
| Lint (check only) | `npx eslint .` | `npx eslint "{src,test}/**/*.ts"` |
| Typecheck | `npx tsc --noEmit` | `npx tsc --noEmit` |
| Unit tests | `npm test` (Vitest, `lib/**/*.test.ts`) | `npm test` |
| e2e tests | `npm run test:e2e` (Playwright; starts its own API and web on ports 3101/3100 against `filemana_test`) | `npm run test:e2e` (Jest + supertest against `filemana_test`) |
| Migrate (local) | — | `npx prisma migrate dev` |
| Seed | — | `npx prisma db seed` (runs `npm run seed`) |
| API types | `npm run api:types` (writes `lib/api/schema.d.ts`; commit it) | `npm run openapi` (writes the git-ignored `openapi.json`; needs the dev DB up) |

Prisma schema: `backend/prisma/schema.prisma` (models: Workspace, User, Session). The DB URL comes from `DATABASE_URL` in `backend/.env`, read by `backend/prisma.config.ts`. Run `npx prisma generate` after changing the schema.

Local services: `docker compose up -d db` starts only the database; `docker compose up -d --build` runs everything: db, a one-off `migrate` (migrations + seed), `api` (:3001) and `web` (:3000). Copy `.env.example` to `.env` first.

Backend tests run Jest with `node --experimental-vm-modules` (the ESM-only `@nestjs/config` and `@nestjs/schedule` need it) and a `.js` module mapper; both are already in the npm scripts. `prisma migrate reset` is blocked for AI agents, so the test database is rebuilt by dropping its schema and running `migrate deploy` (`backend/src/test-db.ts`).

`npm run lint` in `backend/` runs with `--fix` and edits files; use the check-only command when reviewing.

## Skills and Agents

- Frontend work: skill `frontend-ui-engineering` (`frontend/.Codex/skills/`)
- Backend work: skill `backend-nestjs-engineering` (`backend/.Codex/skills/`)
- Review before merge: agents `code-reviewer` (`frontend/.Codex/agents/`) and `backend-reviewer` (`backend/.Codex/agents/`)

## API Contract

- REST + JSON, camelCase. Timestamps in ISO 8601 UTC.
- Due dates are a date (`2026-10-15`) plus an optional time (`14:30`), read in the workspace timezone. Never convert them to UTC.
- The workspace timezone and first day of the week come from workspace settings (FR-SET-14; defaults `Asia/Ho_Chi_Minh` and Monday). "Today", "Overdue" and "Due soon" are computed in that timezone.
- Errors: `{ statusCode, code, message }`. `code` is stable (`TASK_NOT_FOUND`); the frontend maps it to Vietnamese text in the shared strings file.

## Product Rules

Do not change these without being asked.

- No roles: every account has the same rights and sees every project. Anyone can archive or delete anything (Trash keeps it 30 days); only a comment's author can edit or delete it. Archived projects are read-only.
- Task statuses: Todo, In Progress, Review, Done. UI labels: Cần làm, Đang làm, Review, Hoàn thành.
- Priorities: Urgent, High, Medium (default), Low.
- One assignee per task. Only the title is required to create a task.
- Project progress = done tasks / total tasks (subtasks excluded), always computed.
- Due soon = due in 2 days or less (shown amber). The due reminder notification goes out 1 day before. The difference is intentional.
- Deletes are soft deletes, kept in Trash for 30 days.
- Users never get notifications about their own actions.
- UI text is Vietnamese.
- Status colors, always as a small dot or badge with a text label. No other semantic colors.
  - Task: Todo gray, In Progress blue, Review blue (different icon), Done green.
  - Project: Planning gray, Active blue, On hold amber, Completed green, Archived gray.
  - Dates: due soon amber, overdue red. Priority: Urgent red.
- Permissions are checked on the server for every action.

## Security and Docker

- Never commit secrets. `.env.example` lists every variable; real values live only in `.env`, which is git-ignored.
- Never copy `.env` into a Docker image or pass secrets as build args.
- Docker images: multi-stage builds, pinned base image versions, a `.dockerignore`, run as a non-root user, logs to stdout.

## Dev Data

The seed creates one workspace (`WORKSPACE_NAME`) and one account from `SEED_EMAIL`, `SEED_NAME` and `SEED_PASSWORD` in `.env` (FR-ROLE-01). Re-running it changes nothing that already exists. Dev passwords come from `.env`, never from this file. Playwright's throwaway account (`e2e@filemana.test`) lives only in `filemana_test`.

## Git

- One repo at the root for frontend, backend and docs.
- Main branch: `main`. Branch names: `feat/<short-name>`, `fix/<short-name>`.
- Commit messages: `feat(FR-TASK-04): add quick-create task`.

## Do Not

- Edit `frontend/components/ui/` except to fix the design system.
- Add a dependency that is not named in this file or a skill without asking.
- Run migrations or seeds against any non-local database.

## Working Principles

1. **Think before coding.** State assumptions. If something is unclear or has several readings, ask instead of guessing. Say so when a simpler approach exists.
2. **Keep it simple.** Minimum code that solves the task. No speculative features, single-use abstractions or unrequested options. This app has ~10 users; do not build for scale it will never need.
3. **Make surgical changes.** Touch only what the task needs. Match the existing style. Mention unrelated problems instead of fixing them. Remove only what your own change made unused.
4. **Verify against a goal.** Turn tasks into checks: a failing test before a bug fix, the requirement IDs before a screen. For multi-step work, state a short plan with a check for each step.

For trivial tasks, use judgment.

## Definition of Done

- The requirement IDs in scope are met.
- Lint, typecheck and tests pass.
- New screens and data views have loading, empty and error states.
- No unrelated changes in the diff.
