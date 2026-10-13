---
name: frontend-ui-engineering
description: Build or change UI in the Next.js frontend of the internal workspace app (pages, components, layouts, states, styling, accessibility). Use for any user-facing frontend work.
---

# Frontend UI Engineering (Next.js)

Goal: UI that looks designed by a careful product engineer, not generated. Follow `CLAUDE.md` and the requirements spec first; this skill covers how to build it.

## Stack

- Next.js App Router, TypeScript strict
- Tailwind CSS + shadcn/ui (Radix) + Lucide icons
- Barlow (body) and Barlow Condensed (headings) via `next/font`

## Structure

```
app/                     routes, layouts, loading.tsx, error.tsx, not-found.tsx
components/ui/           shadcn primitives (change only to fix the design system)
components/<feature>/    feature components: tasks/, projects/, files/, inbox/
lib/                     data access, formatters, shared helpers
```

Keep a component under ~200 lines. Split when it grows. Prefer composition (`<Card><CardHeader>…`) over many config props.

## Server vs Client Components

- Next.js is UI only. Server Components fetch the NestJS API (forward the session cookie); client components call the NestJS API for mutations. No business logic or permission checks in Server Actions or route handlers.
- Default to Server Components. Fetch initial data on the server, never in `useEffect`.
- Add `"use client"` only to the smallest leaf that needs state, events or browser APIs (dropdowns, drag and drop, editors).
- Never pass functions or non-serializable values from server to client components.
- Mutations update the UI optimistically and roll back with an error toast on failure. Use the data layer the project already uses; do not add a second one.

## URL State

Put shareable UI state in `searchParams`, not component state:

- Filters, sort, grouping, List/Board view
- Open task panel: `?task=WEB-124`, so the link reopens the same task and Esc removes the param

Task lists arrive whole (see `CLAUDE.md`, Architecture): group, filter, sort and count them on the client. If 1,000 rows do not scroll smoothly (NFR-03), virtualize the list.

## Required States

| State | How |
| --- | --- |
| Loading | `loading.tsx` or `<Suspense>` with a skeleton matching the real layout; no full-page spinners |
| Error | `error.tsx` with a plain-language message and Retry (`reset()`) |
| Not found | `not-found.tsx` with a link back to Home |
| Empty | One sentence + one action button, inside the component |
| Success | Toast in the bottom corner, auto-hides after 5 seconds; delete, move and bulk actions include Undo |
| Confirm | Dialog before deleting a project (type its name), deleting a non-empty folder, or deleting permanently from Trash; these use a confirm, not Undo |
| Offline | "Đang mất kết nối" bar at the top; reconnect automatically |

## Design System

- Tokens live in the Tailwind theme in `app/globals.css`: colors, fonts, radius, shadows, light and dark themes, status colors. `design/` is reference only; do not copy values from it without adding them as tokens here.
- Use theme tokens only (`bg-background`, `text-muted-foreground`, `border`). No hex values in components, no arbitrary values like `p-[13px]`.
- Spacing is Tailwind's 4px scale. Dense layout: table rows `h-9` (36px), buttons `h-8`, sidebar items `h-8`.
- Borders over shadows. Shadows only on menus, dialogs, the task panel.
- Brand color only for primary buttons, focus ring, selected nav, links. One primary button per view.
- Status colors as small dots or badges, always with a text label. The color map is in `CLAUDE.md` (Product Rules).
- Avoid the AI look: gradients, `rounded-2xl` everywhere, oversized padding, stat-card grids, lorem ipsum. A single row of small stats is fine where the spec asks for it (FR-PRJ-07).
- Use realistic Vietnamese sample data.

## Accessibility

- Use `<button>` and `<Link>`, never clickable `<div>`s.
- Use shadcn/Radix for dialogs, menus, popovers, selects; they handle focus and keyboard. Do not rebuild them.
- Icon-only buttons need `aria-label`.
- Every input has a label. Visible focus ring on everything interactive.
- Contrast WCAG AA in light and dark themes.

## Responsive

- The product is desktop-first: design and verify at 1280px+ first.
- Tailwind breakpoints are min-width, so write the narrow layout as the base and add `lg:`/`xl:` for desktop.
- At 1024px the sidebar collapses and tables hide secondary columns. Phone layouts are Phase 2.

## Locale

- All user-facing text is Vietnamese and lives in the shared strings file.
- Format dates with the shared helper: `dd/mm/yyyy`, 24-hour time, in the workspace timezone (default `Asia/Ho_Chi_Minh`). Weeks start on the workspace's first day of the week.
- Due dates are a date plus an optional time. Never convert them to UTC or a `Date` at midnight; "Hôm nay", "Quá hạn" and "Sắp đến hạn" use the workspace timezone.
- Relative times ("2 phút trước") differ between server and client. Render them in a client component after mount, or format on the server with the workspace timezone, to avoid hydration mismatches.

## Verification

- [ ] No console errors or hydration warnings
- [ ] Loading, empty, error and permission states exist
- [ ] Keyboard only: Tab through the page, open and close dialogs and the task panel
- [ ] Checked at 1024px, 1280px and 1440px, in light and dark themes
- [ ] Only design tokens used; no arbitrary values
- [ ] Lint and typecheck pass
