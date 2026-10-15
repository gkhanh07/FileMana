# Requirements Specification – Internal Workspace

Oct 12, 2026 · @Khanh

## 1. Overview

This document lists every feature of the internal workspace for about 10 people. Each requirement has its own ID and a priority, so design and development can proceed in phases.

**Purpose.** One place to see what needs doing, track projects, store files and documents, and discuss work directly on each task.

**Users.** About 10 people: developers, designers and 1–2 managers. Used daily on desktop, 4–8 hours a day.

**Out of scope.** Multiple companies/workspaces, Slack-style real-time chat, time and attendance, payroll, customer management (CRM), accounting integrations.

### Priority levels

| Level | Meaning |
|---|---|
| MVP | Required for the first rollout |
| Phase 2 | Added once the whole team uses the MVP reliably |
| Later | Built only when there is a real need |

### Glossary

| Term | Meaning |
|---|---|
| Project | A set of tasks, files and documents with one goal |
| Task | A unit of work with an assignee, a status and a due date |
| Subtask | A smaller piece of work inside a task |
| Milestone | A key project checkpoint with a date, linked to several tasks |
| Doc | A text page written directly in the app |
| File | An uploaded file: PDF, Word, Excel, image, ZIP, video, design file |

**ID convention.** `FR-<area>-<number>` for functional requirements, `NFR-<number>` for non-functional requirements.

## 2. Permissions

There are no roles: every account has the same rights and sees every project. With 10 people, transparency matters more than fine-grained permissions. Trash (30 days) and Undo are the safety net for deletes.

| ID | Requirement | Priority |
|---|---|---|
| FR-ROLE-01 | No roles: every account has the same rights. The workspace and its first account are created by the setup seed; everyone else signs up on their own (FR-AUTH-03) | MVP |
| FR-ROLE-02 | Everyone can view and edit tasks, files and docs in every non-archived project; archived projects are read-only | MVP |
| FR-ROLE-03 | Anyone can archive or delete a project | MVP |
| FR-ROLE-04 | Anyone can delete a task, file or doc; deletes go to Trash for 30 days. Comments are the exception: only their author can edit or delete them (FR-CMT-04) | MVP |
| FR-ROLE-05 | Private projects: visible only to members who were added | Phase 2 |
| FR-ROLE-06 | Guest role: view and comment only in projects they are invited to | Later |

## 3. App shell and navigation

Every page shares one shell: a sidebar on the left and a top bar. Every screen is reachable within 2 clicks from the sidebar.

### Sign-in

**No email (decided 2026-10-13):** the app sends no email in any phase: no invitations, no reset links, no digests (FR-INBOX-09).

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | Sign in with email and password, with a "remember me" option | MVP |
| FR-AUTH-02 | Forgot password: another member sets a temporary password for them on the Members page, which signs out all their sessions | MVP |
| FR-AUTH-03 | Sign up: a sign-up page linked from sign-in; enter email, name and password and land directly in the workspace with the same rights as everyone | MVP |
| FR-AUTH-04 | Sign in with the company Google account | Phase 2 |
| FR-AUTH-05 | Two-factor authentication (2FA) | Later |

### Sidebar and top bar

| ID | Requirement | Priority |
|---|---|---|
| FR-SHELL-01 | 240px sidebar with: company logo and name; Home, My Tasks, Inbox (with unread count), Projects, Docs & Files, Members (moved out of Settings, decided 2026-10-14); a Favorites section; Settings and the user avatar at the bottom | MVP |
| FR-SHELL-02 | Collapse the sidebar into a 56px icon rail; remember the state for next time | MVP |
| FR-SHELL-03 | Pin up to 5 projects to Favorites, drag to reorder | MVP |
| FR-SHELL-04 | 52px top bar: breadcrumb on the left, search field in the center (showing a ⌘K hint), Create button, notification bell and theme toggle on the right | MVP |
| FR-SHELL-05 | The Create button opens a menu: Task, Project, Upload file (Doc waits with FR-DOC-01, decided 2026-10-14) | MVP |
| FR-SHELL-06 | Light, Dark or System theme, saved per user | MVP |
| FR-SHELL-07 | Every page, task, file and doc has its own URL so links can be shared | MVP |
| FR-SHELL-08 | Add Calendar to the sidebar when the Calendar feature ships | Phase 2 |

### Keyboard shortcuts

| Key | Action | Priority |
|---|---|---|
| Ctrl/⌘ + K | Open search and the command palette | MVP |
| C | Quick-create a task | MVP |
| Esc | Close the open panel, modal or menu | MVP |
| G then H / T / I / P | Go to Home / My Tasks / Inbox / Projects | Phase 2 |
| ? | Show the shortcut list | Phase 2 |

Single-key shortcuts do not fire while the cursor is in a text field.

## 4. Home and My Tasks

Home answers one question: what do I need to do today. So the task list always sits at the top, with no grid of stat cards.

### Home

| ID | Requirement | Priority |
|---|---|---|
| FR-HOME-01 | Time-of-day greeting with the user's name and today's date, on one line | MVP |
| FR-HOME-02 | List of tasks assigned to me, grouped into Overdue, Today, Next 7 days; each group collapsible | MVP |
| FR-HOME-03 | The Overdue group comes first, with a red count but no red background | MVP |
| FR-HOME-04 | Each row: checkbox, title, project (color dot + name), priority, relative due date ("Hôm nay", "Thứ 6"), status | MVP |
| FR-HOME-05 | Ticking the checkbox moves the task to Done and shows a small toast with Undo | MVP |
| FR-HOME-06 | Clicking a row opens the task detail panel on the same page | MVP |
| FR-HOME-07 | Right column "Active projects": up to 5 projects I belong to, with name, progress bar, %, due date | MVP |
| FR-HOME-08 | Right column "Recent activity": the 5 newest items relevant to me, with a link to Inbox | Phase 2 |
| FR-HOME-09 | "Coming up" block: milestones and project deadlines in the next 14 days | Phase 2 |

### My Tasks

| ID | Requirement | Priority |
|---|---|---|
| FR-MY-01 | All tasks assigned to me across every project, as a list | MVP |
| FR-MY-02 | Group by due date (default), project or status | MVP |
| FR-MY-03 | Filter by project, priority, status; sort by due date or priority | MVP |
| FR-MY-04 | Completed tasks hidden by default, with a "Show completed" toggle | MVP |
| FR-MY-05 | "Created by me" and "Following" tabs | Phase 2 |
| FR-MY-06 | Remember each user's last filter and grouping | Phase 2 |

## 5. Projects

A project groups tasks, milestones, files and docs. Progress is calculated automatically; nobody enters it by hand.

### Project fields

| Field | Required | Notes |
|---|---|---|
| Name | Yes | Max 80 characters |
| Key | Yes | 2–5 uppercase letters, suggested from the name; used as the task ID prefix (WEB-124) |
| Color and icon | No | Picked at random from a preset palette by default |
| Short description | No | One or two sentences |
| Owner | Yes | Defaults to the creator |
| Members | No | Used to suggest assignees |
| Status | Yes | Planning, Active, On hold, Completed |
| Start date, due date | No | |

### Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-PRJ-01 | Projects page as a table: name + color icon, owner, progress bar, done/total tasks, due date, member avatars, status | MVP |
| FR-PRJ-02 | Filter by status (Completed hidden by default), search by name, sort by due date or last updated | MVP |
| FR-PRJ-03 | Create a project in a single modal; only the name is required, other fields have defaults | MVP |
| FR-PRJ-04 | Progress = completed tasks / total tasks (subtasks excluded) | MVP |
| FR-PRJ-05 | Detail header: icon, name, description, status, due date, member avatars, "…" menu (edit, pin, archive, delete) | MVP |
| FR-PRJ-06 | Tabs: Overview, Tasks, Docs & Files | MVP |
| FR-PRJ-07 | Overview tab: one row of small stats (% progress, Done / In progress / Todo / Overdue), milestone list, recent activity | MVP |
| FR-PRJ-08 | Milestones: create, edit, delete; each has a name, a date, and progress based on its linked tasks | MVP |
| FR-PRJ-09 | Add or remove project members | MVP |
| FR-PRJ-10 | Archive a project: hidden from the list, read-only, restorable | MVP |
| FR-PRJ-11 | Deleting a project requires typing its name to confirm; data stays in Trash for 30 days before permanent deletion | MVP |
| FR-PRJ-12 | Card grid view | Phase 2 |
| FR-PRJ-13 | Dedicated project Activity tab, filterable by person and action type | Phase 2 |
| FR-PRJ-14 | Project templates (Software development, Marketing campaign…) that pre-create milestones and sample tasks | Later |
| FR-PRJ-15 | Timeline/Gantt by milestone | Later |

## 6. Tasks

Tasks are the most-used part of the app, so every everyday action must work in place: inline editing, drag and drop, a side panel. Each task has exactly one assignee so ownership is clear.

### Task fields

| Field | Required | Values / default |
|---|---|---|
| ID | Auto-generated | Project key + incrementing number, e.g. WEB-124 |
| Title | Yes | Max 200 characters |
| Project | Yes | Defaults to the current project, or the most recently used one |
| Status | Yes | Todo (default), In Progress, Review, Done; UI labels: Cần làm, Đang làm, Review, Hoàn thành |
| Priority | Yes | Urgent, High, Medium (default), Low |
| Assignee | No | One person; defaults to the creator |
| Due date | No | Date, optional time |
| Milestone | No | Picked from the project's milestones |
| Labels | No | Multiple labels, shared across the workspace |
| Description | No | Rich text |
| Followers | Automatic | Creator, assignee, anyone mentioned; anyone can follow or unfollow |

Status moves freely between the four values; no approval workflow is enforced. A task whose due date is before today and is not Done counts as overdue; 2 days or less counts as due soon. "Today" uses the workspace timezone (FR-SET-14). The due reminder notification goes out 1 day before (section 8); the gap from the 2-day "due soon" display is intentional.

### List view

| ID | Requirement | Priority |
|---|---|---|
| FR-TASK-01 | Columns: checkbox, title, status, priority, assignee, due date, comment count, attachment count | MVP |
| FR-TASK-02 | Group by status (default), assignee or milestone; each group collapsible | MVP |
| FR-TASK-03 | Filter by assignee, priority, label, due date (overdue, this week); sort by due date, priority, created date | MVP |
| FR-TASK-04 | Inline editing of status, priority, assignee and due date through small dropdowns on the row | MVP |
| FR-TASK-05 | A "+ Add task" row at the end of each group: type a title, press Enter to create | MVP |
| FR-TASK-06 | Right-click a row for a menu: open, copy link, change status, reassign, delete | Phase 2 |

### Kanban board

| ID | Requirement | Priority |
|---|---|---|
| FR-TASK-07 | Four columns by status, each header with a count; same data and filters as the list view | MVP |
| FR-TASK-08 | Compact cards: title (max 2 lines), priority icon, due date, assignee avatar, comment and file counts, up to 2 labels | MVP |
| FR-TASK-09 | Drag cards between columns to change status and within a column to reorder; show a clear drop placeholder | MVP |
| FR-TASK-10 | A "+ Add task" button at the bottom of each column | MVP |
| FR-TASK-11 | The Done column shows only tasks completed in the last 14 days, with a "See all" link | MVP |
| FR-TASK-12 | Horizontal swimlanes by assignee | Phase 2 |

### Task detail panel

| ID | Requirement | Priority |
|---|---|---|
| FR-TASK-13 | Clicking a task opens a 520px panel sliding in from the right; the list behind stays usable; Esc closes it; the URL updates to the task | MVP |
| FR-TASK-14 | Header: task ID, copy link button, open full page, "…" menu, close | MVP |
| FR-TASK-15 | Title editable in place; properties shown as a 2-column name/value list, click to edit | MVP |
| FR-TASK-16 | Rich-text description: headings, lists, checklist, links, images, code blocks; autosaved | MVP |
| FR-TASK-17 | Subtasks: checkbox list with inline add; each subtask has its own assignee and due date; shows progress such as "2/5" | MVP |
| FR-TASK-18 | Attachments: drag files into the panel to upload; show thumbnail, name, size, uploader; these files also appear in the project's Docs & Files | MVP |
| FR-TASK-19 | Two tabs at the bottom of the panel: Comments and Activity (status, assignee, due date changes, uploads, with who and when) | MVP |
| FR-TASK-20 | Time estimate and time spent | Later |

### Quick create

| ID | Requirement | Priority |
|---|---|---|
| FR-TASK-21 | Pressing C, or Create → Task, opens a modal with the cursor already in the title field | MVP |
| FR-TASK-22 | Below the title, a row of property chips (Project, Assignee, Priority, Due date) prefilled with defaults; description and files are optional | MVP |
| FR-TASK-23 | Enter creates and closes; Shift+Enter creates and keeps the modal open for the next task; a small toast links to the new task | MVP |
| FR-TASK-24 | Quick syntax in the title: @name to assign, "mai" (tomorrow), "thứ 6" (Friday) to set the due date | Phase 2 |

### Bulk actions

| ID | Requirement | Priority |
|---|---|---|
| FR-TASK-25 | Select multiple tasks with checkboxes or Shift+click | MVP |
| FR-TASK-26 | Floating action bar at the bottom: change status, assign, change due date, change priority, delete; every action has Undo | MVP |
| FR-TASK-27 | Move multiple tasks to another project | Phase 2 |

### Comments

| ID | Requirement | Priority |
|---|---|---|
| FR-CMT-01 | Comment box pinned to the bottom of the panel; ⌘/Ctrl+Enter to send | MVP |
| FR-CMT-02 | @mentions, suggesting project members first; the mentioned person gets a notification | MVP |
| FR-CMT-03 | Attach files and paste images directly into a comment | MVP |
| FR-CMT-04 | Edit and delete your own comments; show an "edited" label | MVP |
| FR-CMT-05 | Emoji reactions | Phase 2 |
| FR-CMT-06 | Threaded replies under a comment | Phase 2 |
| FR-CMT-07 | Reference another task with # and render it as a link | Phase 2 |

### Currently out of scope

Multiple assignees per task, recurring tasks, task dependencies (blocking/blocked by) and custom statuses per project are all at the Later level.

## 7. Docs and Files

Uploaded files and docs written in the app live together in one "Docs & Files" area, so nobody has to guess where to look. The Docs & Files page is a free space: anyone adds, renames, moves and deletes folders and files right at its top level. Every project also has its own folder, shown only in that project's Docs & Files tab (decided 2026-10-14). Docs written in the app (FR-DOC-01..05) moved to Later the same day; for now the area holds folders and uploaded files only.

### File and folder management

| ID | Requirement | Priority |
|---|---|---|
| FR-FILE-01 | The Docs & Files page lists its own folders and files directly, with no fixed folders. A project's Docs & Files tab opens that project's folder, which is not listed on the Docs & Files page | MVP |
| FR-FILE-02 | Folder breadcrumb, e.g. Docs & Files / Marketing Q4 / Images | MVP |
| FR-FILE-03 | Folders listed first, then files; columns: type icon, name, creator, last updated, size | MVP |
| FR-FILE-04 | Quick filters: All, Files; search by name within the current folder. No Favorites or Recent filters (decided 2026-10-13) | MVP |
| FR-FILE-05 | Upload via a button or by dragging multiple files onto the page; max 100 MB per file | MVP |
| FR-FILE-06 | Upload progress panel in the bottom corner: % per file, cancel per file, clear error when a file is too large | MVP |
| FR-FILE-07 | Create, rename, delete folders; nested subfolders. Only a project's own folder cannot be renamed or deleted (it goes with the project) | MVP |
| FR-FILE-08 | "…" menu and right-click: preview, download, rename, move, copy link, delete | MVP |
| FR-FILE-09 | Drag files onto a folder to move them | Phase 2 |
| FR-FILE-10 | Grid view with thumbnails | Phase 2 |
| FR-FILE-11 | Upload a whole folder, keeping its structure | Phase 2 |

### File preview

| ID | Requirement | Priority |
|---|---|---|
| FR-FILE-12 | In-browser preview for PDF, images, video, text and source code files | MVP |
| FR-FILE-13 | Word, Excel, PowerPoint, ZIP, design files: show a large icon, file info and a Download button | MVP |
| FR-FILE-14 | Right panel: name, type, size, uploader, created date, updated date, project, tasks this file is attached to | MVP |
| FR-FILE-15 | In-browser preview for Word, Excel and PowerPoint | Phase 2 |
| FR-FILE-16 | Comments on files | Phase 2 |
| FR-FILE-17 | Upload a new version over an existing file and view version history | Later |

### Docs written in the app

| ID | Requirement | Priority |
|---|---|---|
| FR-DOC-01 | Create a doc in any folder; a new doc opens immediately with the cursor in the title | Later |
| FR-DOC-02 | Block editor; type "/" to insert: heading, paragraph, bulleted and numbered lists, checklist, table, image, file, link, code block, quote, divider | Later |
| FR-DOC-03 | Continuous autosave with a "Saving… / Saved" indicator | Later |
| FR-DOC-04 | When someone else has the same doc open, show their avatar and warn before overwriting | Later |
| FR-DOC-05 | @mentions (send a notification); links to tasks and projects rendered as chips with their status | Later |
| FR-DOC-06 | Real-time collaborative editing | Phase 2 |
| FR-DOC-07 | Select text to comment on it | Phase 2 |
| FR-DOC-08 | Nested subpages inside a doc, with a page tree in the side bar | Phase 2 |
| FR-DOC-09 | Edit history and restoring an older version | Later |
| FR-DOC-10 | Export a doc to PDF | Later |

All content is internal only: "Copy link" works only for signed-in users. Public links for outsiders and a per-person sharing permission dialog are at the Later level.

## 8. Inbox and notifications

The Inbox only receives what needs the user's attention or action. Nobody is notified about their own actions.

**On hold (decided 2026-10-13):** the whole Inbox and every notification, not built in any phase until the product owner asks for it. The notification parts of other MVP requirements wait with it: the unread count in FR-SHELL-01, the bell in FR-SHELL-04, FR-HOME-08, the notification in FR-CMT-02 and FR-DOC-05 (the @mention itself stays MVP), and "Go to Inbox" in FR-SEARCH-04.

### Events that create a notification

| Event | Recipient | Priority |
|---|---|---|
| Assigned a task | The assignee | Phase 2 |
| Mentioned with @ in a comment or doc | The mentioned person | Phase 2 |
| New comment on a task | Task followers | Phase 2 |
| Task status, due date or assignee changed | Task followers | Phase 2 |
| Task due in 1 day, or just became overdue | The assignee | Phase 2 |
| Added to a project | The person added | Phase 2 |
| Project status or due date changed | Project members | Phase 2 |

### Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-INBOX-01 | Two panes: notification list on the left, the related task/doc on the right (editable in place) | Phase 2 |
| FR-INBOX-02 | Each item: actor avatar, a description ("Minh đã nhắc bạn trong 'Thiết kế trang chủ'"), project, relative time, unread dot | Phase 2 |
| FR-INBOX-03 | Filters: All, Mentions, Assigned to me, Unread | Phase 2 |
| FR-INBOX-04 | Several events on the same task are grouped into one item showing the latest event | Phase 2 |
| FR-INBOX-05 | Opening an item marks it read; mark unread, mark all as read, archive | Phase 2 |
| FR-INBOX-06 | The bell in the top bar shows the unread count and opens a list of the 10 newest notifications with an "Open Inbox" link | Phase 2 |
| FR-INBOX-07 | New notifications appear without reloading the page | Phase 2 |
| FR-INBOX-08 | Snooze a notification and get reminded later (this afternoon, tomorrow) | Phase 2 |
| FR-INBOX-09 | Removed: no email (see Sign-in) | Removed |
| FR-INBOX-10 | Browser push notifications | Phase 2 |
| FR-INBOX-11 | Users turn each notification type and channel on or off | Phase 2 |
| FR-INBOX-12 | Forward notifications to Slack, Zalo or Telegram | Later |

## 9. Search and command palette

Ctrl/⌘ + K is the fastest way to go anywhere or do anything without the mouse.

| ID | Requirement | Priority |
|---|---|---|
| FR-SEARCH-01 | Ctrl/⌘ + K or clicking the search field opens a 640px command palette in the center of the screen | MVP |
| FR-SEARCH-02 | Search task titles and IDs, project names, doc and file names, member names; diacritic-insensitive for Vietnamese ("thiet ke" finds "Thiết kế") | MVP |
| FR-SEARCH-03 | Results grouped: Tasks, Projects, Docs & Files, Members, Commands; each row has an icon, name, location (project), last updated | MVP |
| FR-SEARCH-04 | Commands group: Create task, Create project, Create doc, Go to Inbox, Toggle light/dark theme | MVP |
| FR-SEARCH-05 | Arrow keys to select, Enter to open, Esc to close; recently viewed items shown before typing | MVP |
| FR-SEARCH-06 | Results appear within 300 ms after the user stops typing | MVP |
| FR-SEARCH-07 | Search inside doc content, task descriptions and comments | Phase 2 |
| FR-SEARCH-08 | Quick filters by prefix, e.g. "@Minh" or "project:WEB" | Phase 2 |
| FR-SEARCH-09 | Full search results page with filters by type, project, person, time | Later |
| FR-SEARCH-10 | Search inside PDF and Word file contents | Later |

## 10. Calendar

The calendar only re-displays existing task due dates, project deadlines and milestones, so this whole section is Phase 2. It does not replace Google Calendar or Outlook.

| ID | Requirement | Priority |
|---|---|---|
| FR-CAL-01 | Month and week views; Today button, previous/next navigation | Phase 2 |
| FR-CAL-02 | Show task due dates, project deadlines and milestones as small labels with the project color dot; never fill whole day cells with color | Phase 2 |
| FR-CAL-03 | Filters: My tasks (default), All, by project | Phase 2 |
| FR-CAL-04 | Days with more than 3 items show "+N more", click to see all | Phase 2 |
| FR-CAL-05 | Clicking an item opens the task detail panel or the project page | Phase 2 |
| FR-CAL-06 | Drag a task to another day to change its due date | Phase 2 |
| FR-CAL-07 | Click an empty day to create a task due on that day | Phase 2 |
| FR-CAL-08 | iCal feed link to sync task due dates into Google Calendar | Later |
| FR-CAL-09 | Create standalone meeting events in the app | Later |

## 11. Activity and reports

The activity log is recorded from the MVP because the task panel, project overview and Home all need it. A dedicated activity page and reports are Phase 2.

### Activity log

| ID | Requirement | Priority |
|---|---|---|
| FR-ACT-01 | Record: task created/edited/deleted, status changes, assignments, due date changes, comments, uploads, docs created/edited, projects created/archived, members added | MVP |
| FR-ACT-02 | Each entry has the actor, action, target, old → new value, timestamp | MVP |
| FR-ACT-03 | Consecutive changes by the same person on the same task within 5 minutes are merged into one entry | MVP |
| FR-ACT-04 | Company-wide Activity page as a timeline, filterable by person, project, action type, date range | Phase 2 |

### Reports

| ID | Requirement | Priority |
|---|---|---|
| FR-REP-01 | Four small metrics in one row: active projects, open tasks, overdue tasks, tasks done this week | Phase 2 |
| FR-REP-02 | Bar chart of tasks completed per week over the last 12 weeks | Phase 2 |
| FR-REP-03 | Workload table per person: open, overdue, done this week; click a name to see their tasks | Phase 2 |
| FR-REP-04 | Project table: progress, overdue tasks, due date, days remaining | Phase 2 |
| FR-REP-05 | Pick a date range and export CSV | Later |

Reports are not for scoring individuals; the goal is to see who is overloaded and which projects are at risk of slipping.

## 12. Settings and administration

Settings has three groups: Personal, Members and Workspace. All of them are open to everyone. The member list replaces a separate Teams page, since 10 people are one team.

### Personal

| ID | Requirement | Priority |
|---|---|---|
| FR-SET-01 | Profile: avatar, name, job title | MVP |
| FR-SET-02 | Change password, sign out of all devices | MVP |
| FR-SET-03 | Light / Dark / System theme | MVP |
| FR-SET-04 | Notification settings by type and channel (see FR-INBOX-11) | Phase 2 |
| FR-SET-05 | English interface language | Later |

### Members

| ID | Requirement | Priority |
|---|---|---|
| FR-SET-06 | Member table: avatar, name, job title, email, open task count, status (Active, Deactivated); a "Reset password" action per member (FR-AUTH-02). Any member can also add an account (with a temporary password), edit a member's name, email and job title, and delete an account that has no projects, tasks, comments or activity (otherwise use FR-SET-09) | MVP |
| FR-SET-07 | Removed: no invitations, people sign up themselves (see FR-AUTH-03) | Removed |
| FR-SET-08 | Removed: there are no roles (see FR-ROLE-01) | Removed |
| FR-SET-09 | Deactivate a member who leaves: they can no longer sign in, their data stays; if they have open tasks, require choosing who takes them over | MVP |
| FR-SET-10 | Click a member to see their profile page: projects they belong to and open tasks | Phase 2 |

### Workspace

| ID | Requirement | Priority |
|---|---|---|
| FR-SET-11 | Company name and logo | MVP |
| FR-SET-12 | Manage shared labels: add, rename, recolor, merge, delete | MVP |
| FR-SET-13 | Trash: view and restore tasks, files, docs and projects deleted within 30 days; delete permanently | MVP |
| FR-SET-14 | First day of the week (default Monday) and timezone (default Asia/Ho_Chi_Minh) | MVP |
| FR-SET-15 | Storage used and the largest files | Phase 2 |
| FR-SET-16 | Export all workspace data | Later |

## 13. UI states and messages

Every screen must be designed in four states: loading, empty, error and with data. Messages say what happened and what the user can do next, never technical error codes.

| ID | Requirement | Priority |
|---|---|---|
| FR-UI-01 | Loading: skeletons matching the shape of the real content; no full-page spinners | MVP |
| FR-UI-02 | Empty: one short explanatory sentence and one action button | MVP |
| FR-UI-03 | Error: plain-language message with a Retry button; input errors shown right under the invalid field | MVP |
| FR-UI-04 | Success: small toast in the bottom corner, auto-hides after 5 seconds; delete, move and bulk actions include Undo | MVP |
| FR-UI-05 | Edits show their result immediately (optimistic updates), roll back to the old value and show an error if saving fails | MVP |
| FR-UI-06 | Offline: an "Đang mất kết nối" (connection lost) bar at the top; reconnect automatically | MVP |
| FR-UI-07 | Confirm before deleting a project, a non-empty folder, or permanently deleting from Trash | MVP |
| FR-UI-08 | Every clickable element has hover, focus (clearly visible ring), selected and disabled states | MVP |

### Sample UI copy

The interface is in Vietnamese; English meanings are given for reference.

| Situation | UI copy (Vietnamese) | English meaning | Button |
|---|---|---|---|
| No tasks today | Bạn không có việc nào đến hạn hôm nay. | You have no tasks due today. | Tạo việc (Create task) |
| New project with no tasks | Dự án này chưa có công việc nào. | This project has no tasks yet. | Thêm việc đầu tiên (Add the first task) |
| Empty folder | Kéo tệp vào đây để tải lên. | Drop files here to upload. | Tải lên (Upload) |
| Empty Inbox | Bạn đã xem hết thông báo. | You're all caught up. | (none) |
| No search results | Không tìm thấy kết quả cho "…". Thử từ khóa khác. | No results for "…". Try another keyword. | Tạo việc "…" (Create task "…") |
| File too large | Tệp "…" vượt quá 100 MB nên chưa tải lên được. | "…" is over 100 MB and could not be uploaded. | Chọn tệp khác (Choose another file) |
| Save failed | Chưa lưu được thay đổi. Kiểm tra kết nối rồi thử lại. | Changes not saved. Check your connection and try again. | Thử lại (Retry) |
| No permission | Bạn không có quyền thực hiện thao tác này. | You don't have permission to do this. | Đóng (Close) |
| Broken link | Trang này đã bị xóa hoặc link không đúng. | This page was deleted or the link is wrong. | Về Trang chủ (Go to Home) |

## 14. Non-functional requirements

With 10 users, the priorities are feeling fast, never losing data and solid baseline security; there is no need to design for thousands of users.

| ID | Area | Requirement | Priority |
|---|---|---|---|
| NFR-01 | Performance | Home and task lists load in under 2 seconds; in-app navigation under 300 ms | MVP |
| NFR-02 | Performance | Edits (tick, drag and drop, status change) respond on screen in under 100 ms | MVP |
| NFR-03 | Performance | A list of 1,000 tasks still scrolls smoothly | MVP |
| NFR-04 | Security | HTTPS everywhere; passwords stored with a one-way hash; sign-in attempts rate-limited per IP; no account lockout | MVP |
| NFR-05 | Security | Files downloadable only when signed in; download links expire | MVP |
| NFR-06 | Security | Permissions checked on the server for every action, not just by hiding buttons in the UI | MVP |
| NFR-07 | Data | Daily backups of the database and files, keeping the last 30; restore tested at least once | MVP |
| NFR-08 | Data | Deletes are soft deletes, kept 30 days in Trash | MVP |
| NFR-09 | Browsers | Latest two versions of Chrome, Edge, Safari, Firefox | MVP |
| NFR-10 | Screens | Primary design for screens 1280px and wider; from 1024px the sidebar collapses and tables hide secondary columns | MVP |
| NFR-11 | Screens | Phones from 360px: bottom navigation (Home, Tasks, Projects, Inbox, More), task lists as cards, detail panel opens full screen | Phase 2 |
| NFR-12 | Accessibility | Text contrast meets WCAG AA in both themes; all main features usable by keyboard; status never conveyed by color alone | MVP |
| NFR-13 | Formatting | Dates dd/mm/yyyy, 24-hour time, relative times in Vietnamese ("2 phút trước", "Hôm qua") | MVP |
| NFR-14 | Real time | Other people's changes appear within 5 seconds without reloading the page | MVP |
| NFR-15 | Operations | Log server and browser errors for troubleshooting | MVP |

## 15. Rollout roadmap

The MVP contains everything the team needs to drop their old tools and use the app every day. Phase 2 starts only once the MVP runs reliably; Later items are built only when someone actually needs them.

**The MVP covers daily use; everything else is added gradually.**

| MVP — First rollout | Phase 2 — Once the MVP is stable | Later — Only when needed |
|---|---|---|
| App shell, sign-in | Month and week calendar | Timeline/Gantt, templates |
| Home, My Tasks | Reports | File version history |
| Projects and milestones | Activity page | Guest role |
| List, Kanban, task panel | Real-time doc editing | Public share links |
| Comments, @mentions | Google sign-in | Recurring, dependent tasks |
| Basic files and docs | Push, settings | Time tracking |
| ⌘K search | Inbox, mobile layouts | Slack, Zalo integrations |
| Members, Trash | Private projects | 2FA, English UI |

Gates: MVP → Phase 2 when the team uses the MVP reliably; Phase 2 → Later when a real need appears.

Each item in the roadmap maps to the requirement IDs with the same priority in the sections above.

### Suggested UI design order

1. Design system: colors, type, spacing, base components, light and dark themes
2. App shell (sidebar, top bar) and Home
3. Task list and Kanban board inside a project
4. Task detail panel and quick-create modal
5. Projects list and project Overview tab
6. ⌘K command palette and Inbox
7. Docs & Files, doc editor
8. Settings, members, empty and error states
9. Phase 2: Calendar, Reports, mobile layouts
