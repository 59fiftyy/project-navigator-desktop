# Atlas V1 — adopt the "Workspace" mockup direction

## 1. Summary

**Atlas today (verified in the repo)**
- Vite + React 18 + TS SPA inside Tauri 2. No router: `App.tsx` switches 7 sections with keep-alive panes (Dashboard, Project Map, Documentation, Roadmap, Git, Notes, Settings).
- Engine pipeline `scan -> classify -> analyze -> knowledge -> context -> understand` behind the `ProjectFileSystem` abstraction; state in `ProjectProvider` (`projectStore.tsx`).
- Rust commands: `scan_directory`, `read_file`, `write_file`, `reveal_in_file_manager`, `open_path`, `git_is_repository/status/remote_url/clone/pull` — all async, off the main thread.
- Styling: Tailwind v4 + shadcn, oklch tokens in `src/styles.css`, dark only (`:root, .dark` share one palette), cyan primary, card-heavy layout.
- Tests: only 5 Rust unit tests in `lib.rs`. No frontend tests.

**Mockup (`Main.dc.html`, read from source)**
- Claude "Design Component": `<x-dc>` template with `{{…}}` bindings, `<sc-for>`/`<sc-if>` and a `DCLogic` class. None of it runs in React; it is a value reference only.
- Layout: 40px top bar (project switcher, centered search "Ctrl K", Re-analyze, Light toggle, fake window buttons) / 3 columns `232px sidebar | 400px list | content` / 28px status bar.
- Tokens: bg `#1B1B1E`, side `#161618`, raise `#212125`, hover `#242428`, sel `#2E2E33`, line `#2A2A2F`, text `#ECECEE`, mute `#9A9AA3`, one amber signal `#E0A458`; full light set via `:has(#lm:checked)`. Primary button = inverted (text color bg). Radii 5–8px, 120–200ms ease-out, reduced-motion respected.
- Type: Segoe UI Variable / system UI 14px/1.5; Cascadia Mono / ui-monospace 12.5px for paths.
- Documentation screen is the hero: doc list with purpose + date, "Behind the code" filter, detail with sync status, linked changed files with token counts, token meter, "Copy for Claude", history.
- All data is hardcoded (7 docs, diffs, token counts, history, "128 files · 14,532 lines", ticking "watching" timer, fake 1.8s analyze).

## 2. Key differences

| Area | Atlas | Mockup |
|---|---|---|
| Shell | Sidebar only | Top bar + sidebar + status bar |
| Visual | Cards, cyan accent, oklch blue-grey | Flat panes, separators, neutral greys, single amber signal |
| Theme | Dark only | Dark + light |
| Docs | List + textarea editor, Create, README last | List + purpose/date + drift status + context brief |
| File tree | Full virtualized tree in Project Map | Mini tree in sidebar |
| Status | None | Live file/line counts + analysis state |
| Features | Git, Notes, Roadmap exist | AI Chat, Snapshots, Backups (nav only, no content) |

## 3. Decision matrix

| Item | Decision | Reasoning |
|---|---|---|
| Engine, `ProjectFileSystem`, Rust commands | KEEP | Working source of truth; UI work must not touch it. |
| Keep-alive panes, virtualized Project Map, clipboard, context menu actions | KEEP | Recent performance/stability fixes; restyle only. |
| Design tokens / palette | REPLACE | Swap cyan/oklch set for the mockup's neutral + amber tokens, mapped onto existing shadcn variable names so every component re-themes at once. |
| Light theme | ADD | Real `.dark`/`.light` class on `<html>`, persisted in settings, default dark. |
| App shell | ADAPT | Add top bar (project name/switch, Re-analyze, theme toggle) and status bar (real counts + real analysis state). Keep native window chrome; drop fake minimize/close buttons. |
| Sidebar | ADAPT | Mockup nav styling (30px rows, hover bg, bold active, amber count badge = number of missing docs). No mini file tree (duplicates Project Map, costly on 20k-file projects). |
| Dashboard | ADAPT | Remove card grid; flat sections with separators, same real data (stats, stack, vision, goals, categories, important files). |
| Documentation | ADAPT (hero) | Adopt 400px list column (name, purpose, last-modified date, amber dot for missing/unsaved) + content pane. Keep editor, Create, Ctrl+S, unsaved guard, README last. Add header with "Open" (existing `open_path`). |
| "Behind the code" drift | DEFER (or V1 — your call) | Needs real file modified-times from Rust and a comparison rule; mockup values are invented. |
| "Copy for Claude" brief | ADD (lean) | Real value: copies selected doc + chosen linked files as one Markdown block via existing clipboard. Token estimate = chars/4, labeled "approx". No ChatGPT button. |
| Doc history | DEFER | Would need git log per file; not essential. |
| Project Map | ADAPT | Restyle rows to mockup tree (25px rows, chevron, mono). Logic untouched. |
| Roadmap, Notes, Git, Settings | ADAPT | Restyle only. Settings gains Theme. |
| Top-bar search (Ctrl K) | ADD (lean) | Command palette (existing `command.tsx`) to jump to screens, docs and files by name — uses already-loaded file list, no new backend. |
| AI Chat, Snapshots, Backups | REMOVE from scope | Nav-only in mockup with no defined behavior; adding empty pages contradicts "no fake features". |
| "Watching for changes" live timer | DEFER | Needs a Rust file watcher; status bar shows "analyzed X ago" from real `lastAnalyzedAt` instead. |
| Hardcoded mockup data | REMOVE | Never copied. |

## 4. Target layout

```text
+----------------------------------------------------------------+
| Atlas  [project ▾]      [ Search…  Ctrl K ]   Re-analyze  ☾/☀ |  40px
+--------+-------------------------------------------------------+
| Nav    |  Screen content (per section)                         |
| 232px  |  Documentation: [ doc list 400px | doc detail/editor ] |
|        |  Others: single content pane                          |
| project|                                                       |
+--------+-------------------------------------------------------+
| 4,004 files · 6 technologies          ● Analyzed 3 min ago    |  28px
+----------------------------------------------------------------+
```

## 5. Files affected

- `src/styles.css` — new token set (dark + light), fonts, motion, reduced-motion.
- `src/App.tsx` — shell grid with `TopBar` + `StatusBar`; panes unchanged.
- New: `src/ui/layout/TopBar.tsx`, `StatusBar.tsx`, `CommandPalette.tsx`, `src/app/theme.ts`.
- `src/ui/layout/Sidebar.tsx`, `ScreenHeader.tsx` — restyle, badge.
- `src/ui/screens/*` — Dashboard, DocumentationScreen (largest change), ProjectMap (row styling), Roadmap, Notes, Git, Settings, Welcome/Analyzing/Error.
- New: `src/app/contextBrief.ts` (brief builder, pure function).
- `src/components/ui/button.tsx`, `badge.tsx`, `card.tsx` — variant tweaks only (inverted primary, flat).
- `index.html` — `class="dark"` default, title/meta.
- `AGENTS.md` — record token/theme rule.

## 6. Backend / data / persistence

- None required for the V1 core.
- Theme preference persisted with the existing settings store (tauri plugin-store / localStorage fallback as already used).
- Only if you choose drift detection in V1: extend `scan_directory` (or add `file_metadata`) to return modified time, add it to `ProjectFile`, and compute "doc older than code it references" in a pure function. Engine output stays backward compatible.

## 7. Implementation sequence

1. **Tokens + theme** — new palette, light theme, toggle, persistence. Milestone: whole app re-themes, both modes readable.
2. **Shell** — TopBar, StatusBar, Sidebar restyle. Depends on 1.
3. **Documentation screen** — list column + detail, keep all existing behavior, add Open + Copy brief. Depends on 2.
4. **Other screens restyle** — Dashboard, Project Map rows, Roadmap, Git, Notes, Settings, state screens.
5. **Command palette** (Ctrl K).
6. **Optional: drift detection** (Rust + engine) if approved.
7. **Verification pass.**

## 8. Testing

- Add Vitest + unit tests for pure rules: README sorts last, doc file resolution into `Atlas/`, brief builder output/token estimate, theme persistence default = dark.
- Keep Rust tests passing (`cargo test`), `cargo check`, typecheck, lint, build.
- Playwright in preview with a real large folder: tab switching keeps scroll/state, Project Map scrolling frame time unchanged (~19ms), copy name/path, docs edit/save/create, unsaved guard, both themes screenshotted, no console errors.
- Native-only items (folder picker, Git clone/pull, reveal/open) need a local `npm run tauri dev` check by you.

## 9. Risks and decisions needing your input

1. **Drift detection ("Behind the code")** — the mockup's most distinctive feature, but it needs a Rust change and a definition of "behind". V1 or later?
2. **Accent color** — adopt the mockup's amber signal and drop cyan entirely? (Recommended: yes, it is the mockup's identity.)
3. **Copy for Claude** — include the lean brief in V1, or defer?
4. **Fonts** — mockup uses Segoe UI Variable / Cascadia Mono (Windows). Plan uses system UI stacks so macOS/Linux look native; no bundled fonts. OK?
5. **Risk**: restyling every screen touches many files; mitigated by doing tokens first so most change is in CSS, and by leaving engine/store/Rust untouched.
