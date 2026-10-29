# Dashboard: Tasks, Project Map preview, Recent activity (from Project Compass UI)

## Goal
Bring the three panels you liked from Project Compass UI into the Atlas Dashboard, fed only by real project data, in Atlas's current neutral + amber style (both themes).

## Layout
```text
+-----------------------------------------------------------+
| Project name · path                         Re-analyze    |
| [Files] [Docs] [Directories] [Technologies]  (KPI strip)  |
+------------------------------+----------------------------+
| Project map (roots graph)    | Tasks                      |
|  root -> top folders         |  open / done from Roadmap  |
|  [View full map ->]          |  [Open Roadmap ->]         |
+------------------------------+----------------------------+
| Recent activity (latest commits, doc saves, analysis)     |
+-----------------------------------------------------------+
| Existing sections (vision, goals, categories...) below    |
+-----------------------------------------------------------+
```

## 1. Project map preview (roots)
- Small vector graph: center node = project, lines ("roots") to each top-level folder; each folder node shows file count; up to ~8 largest, the rest grouped as "+N more" (preview only — the full map stays complete).
- Curved thin lines in border color, nodes in surface color, the biggest folder highlighted in amber.
- Clicking a node or "View full map" opens Project Map.
- Data: existing scanned file list, counted once and memoized.

## 2. Tasks
- Source: checklist lines in the project's Roadmap doc (`- [ ]` open, `- [x]` done); plain bullets shown as open.
- Shows progress bar (done / total), first ~6 open tasks grouped by roadmap section.
- Checking a task writes the change back into the real Roadmap file (same safe save + quick refresh used by Documentation, no full scan).
- No roadmap: empty state with "Create Roadmap" (existing explicit Create action).

## 3. Recent activity
- Merged timeline, newest first, relative time ("3 min ago"):
  - Last 10 Git commits (message, author, time) — needs a new read-only Git log command.
  - Documentation saves/creates done in Atlas (kept per project locally, like Notes).
  - Last analysis time.
- Not a Git repo / browser preview: shows only the other entries, with a short hint.

## Not included
No fake data, no new pages, no changes to engine logic, Project Map screen or existing Git actions.

## Technical details
- Rust: add async `git_log(path, limit)` using existing safe runner (`git log -n N --pretty=%H%x1f%an%x1f%at%x1f%s`, prompts off, timeout); register it. Frontend `recentCommits()` in `gitService.ts`.
- New pure helpers in `src/app/dashboardInsights.ts`: `topLevelFolders(files)`, `parseTasks(markdown)`, `toggleTask(markdown, lineIndex)`, `mergeActivity(...)`.
- New `src/app/useActivityLog.ts` (localStorage per project); `projectStore` logs doc save/create and analysis.
- New components in `src/ui/dashboard/`: `Panel.tsx` (38px header, divider, ArrowUpRight action), `MapPreview.tsx` (SVG), `TasksPanel.tsx`, `ActivityPanel.tsx`.
- `Dashboard.tsx` gets an `onNavigate` prop from `App.tsx` to jump to Map/Roadmap.
- Tests (Vitest, `src/app/dashboardInsights.test.ts`): task parsing open/done, toggle changes only that line, folder counts and "+N more" grouping, activity ordering newest first.
- Verify: typecheck, lint, Vitest, cargo check/test, Playwright screenshots of both themes; native Git log needs your local `npm run tauri dev` check.
