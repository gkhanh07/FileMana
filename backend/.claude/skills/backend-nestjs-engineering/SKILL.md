---
name: backend-nestjs-engineering
description: Build or change the NestJS backend of the internal workspace app (API endpoints, modules, services, database, auth, permissions, file storage, real-time events). Use for any backend or API work.
---

# Backend Engineering (NestJS)

Goal: a small, boring, secure API for ~10 users. Follow `CLAUDE.md` and `docs/requirements.md` first; this skill covers how to build it.

## Stack

- NestJS, TypeScript strict
- PostgreSQL with Prisma (the only ORM)
- `class-validator` DTOs, `@nestjs/config` with schema validation
- Docker Compose for local Postgres

## Structure

```
src/
  modules/<feature>/     auth, users, projects, tasks, comments, files, docs, notifications, activity
    <feature>.module.ts
    <feature>.controller.ts
    <feature>.service.ts
    dto/
  common/                guards, decorators, filters, interceptors
  config/                env schema and config
prisma/
  schema.prisma
  migrations/
  seed.ts
```

One module per domain. A module uses another module only through its exported service, never its repository.

## Layers

- Controller: HTTP only. Validate input with a DTO, read the current user, call one service method, return a response DTO.
- Service: all business rules and permission checks.
- Data access only inside services (or a repository the service owns).
- Never return Prisma models directly. Map to a response DTO so fields like `passwordHash` never leak.

## API Conventions

- REST, JSON, camelCase, plural nouns: `GET /projects/:id/tasks`, `PATCH /tasks/:id`.
- `PATCH` for partial updates (inline editing sends one field at a time).
- Timestamps in ISO 8601 UTC. The frontend formats them in the workspace timezone.
- Due dates: a Postgres `date` (`dueDate`, `2026-10-15`) plus an optional `dueTime` (`14:30`), read in the workspace timezone. Never store them as a UTC timestamp.
- Timezone and first day of the week come from workspace settings (FR-SET-14; defaults `Asia/Ho_Chi_Minh`, Monday). Compute "today", overdue, due soon (≤ 2 days) and due reminders (1 day before) in that timezone.
- Task list endpoints (a project's tasks, My Tasks, Home) return every matching task in one response; the client groups, filters and counts. Every other list endpoint is paginated (`limit` with a max, plus cursor or offset): notifications, activity, files, Trash, the Done column's "See all".
- Errors use one shape: `{ statusCode, code, message }`. `code` is stable (`TASK_NOT_FOUND`); the frontend maps it to Vietnamese text. Throw Nest `HttpException`s; a global filter formats them and hides internal details.

## Validation

- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- A DTO for every body and query. Validate IDs and enums (statuses, priorities from the spec).
- Never trust IDs of the acting user from the client; take them from the authenticated request.

## Auth and Permissions

- Global auth guard; mark open routes with a `@Public()` decorator.
- Session or refresh token in an httpOnly, secure, SameSite cookie. Store sessions server-side so "sign out of all devices" works.
- Hash passwords with argon2. Rate-limit sign-in per IP; no account lockout (NFR-04).
- This API is the only place that checks auth and permissions; the Next.js frontend has no business logic.
- No roles: every signed-in account has the same rights. The per-object rules (only a comment's author edits or deletes it; archived projects are read-only) are checked in the service, on the server, every time.

## Product Rules in the Backend

- Soft delete with `deletedAt`; every query excludes deleted rows; a scheduled job purges rows older than 30 days.
- Archived projects are read-only: reject writes to them and their tasks, files and docs.
- Task keys (`WEB-124`) come from a per-project counter incremented inside a transaction.
- Project progress is computed from tasks, never stored or accepted from the client.
- Write the activity log entry in the same transaction as the change it records.
- Create notifications after the change commits, and never for the actor.
- Push real-time updates (WebSocket gateway or SSE) after commit; clients refetch or patch their cache.

## Database

- Schema changes only through `prisma migrate`. No `prisma db push` outside local dev; production runs `prisma migrate deploy`.
- Use a transaction whenever one action writes more than one row.
- Index foreign keys and columns used in filters (`assigneeId`, `projectId`, `dueDate`, `status`).
- Avoid N+1 queries: load relations in one query.

## Files

- Store files on local disk (upload directory from config, mounted as a Docker volume), never in the database. Use Nest's built-in `FileInterceptor` (multer ships with `@nestjs/platform-express`).
- Enforce the 100 MB limit and allowed types on the server.
- Downloads go through short-lived signed URLs issued only to signed-in users.

## Security and Operations

- `helmet`, CORS limited to the frontend origin.
- Config and secrets come from environment variables, validated at startup; the app fails fast if one is missing.
- Log to stdout in JSON. Never log passwords, tokens or file contents.
- Health check endpoint for Docker.

## Tests

- Unit tests for services: business rules and permission checks.
- e2e tests (supertest, real Postgres in Docker) for auth and the main task flows.
- Every bug fix starts with a failing test.

## Verification

- [ ] Every new endpoint has a DTO, an auth decision (`@Public()` or guarded) and a permission check
- [ ] Responses use response DTOs; no entity or secret leaks
- [ ] Non-task lists are paginated; no N+1 queries
- [ ] Due dates stay date + optional time; "today" and overdue use the workspace timezone
- [ ] Multi-row writes run in a transaction; activity log written with the change
- [ ] Migration included for any schema change
- [ ] Lint, typecheck, unit and e2e tests pass
