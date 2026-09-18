# Atlas — Stability Investigation (Git freeze, Copy crash, Scrolling)

Findings below come from reading the actual code: `src-tauri/src/lib.rs`, `src/platform/gitService.ts`, `src/ui/screens/GitScreen.tsx`, `src/lib/clipboard.ts`, `src/ui/screens/ProjectMap.tsx`, `src/app/projectStore.tsx`, `src-tauri/capabilities/default.json`. No new systems, no UI redesign, no new Git features.

## A. Git Clone freezes the whole app

Root cause (confirmed in code): every Git command in `src-tauri/src/lib.rs` is a **synchronous** `#[tauri::command] fn` that calls `std::process::Command::output()`. Tauri 2 runs synchronous commands on the main thread, so the window's event loop is blocked for the entire duration of `git clone`. The window stops painting and the OS reports "Atlas is not responding".

Second cause of the *indefinite* hang: `git` is spawned with an inherited environment and no prompt suppression. On a private/2FA repo or a bad URL, Git waits forever on a credential/host-key prompt that has nowhere to appear. `Command::output()` also buffers stdout/stderr to completion, so nothing returns.

Why the empty folder remains: `git clone` creates the destination directory first, then blocks on auth. Since the process never finishes, no cleanup path ever runs; Atlas has no partial-state handling at all.

Fix (Rust + React):
- Convert all Git commands to `async fn` and run the blocking process work inside `tauri::async_runtime::spawn_blocking`, so the event loop stays free. Keep `run_git` as the single shared helper — no parallel Git layer.
- Harden the spawned environment in `run_git`: `GIT_TERMINAL_PROMPT=0`, `GIT_ASKPASS=""`, `SSH_ASKPASS=""`, `GCM_INTERACTIVE=never`, and `-c credential.helper=` for clone, so authentication failures return an error instead of hanging.
- Add a wall-clock timeout for clone/pull (default around 5 minutes): spawn with `.spawn()`, poll `try_wait()` in the blocking task, kill the child on timeout and return a clear "operation timed out" error.
- Partial-state handling: `git_clone` records whether the target directory existed before it ran. On failure or timeout, if Atlas created it and it contains no `.git` (or is empty), remove it and say so in the error message. Never delete a pre-existing directory.
- Frontend: `GitScreen` keeps its current layout; it gains a visible "Cloning…" indicator that cannot be double-submitted (already guarded) and surfaces the timeout/cleanup message in the existing error block. Optional small addition consistent with the current design: a Cancel button that simply stops waiting on the promise is *not* planned, since the backend timeout covers the hang.

Testing: clone a small public repo (success), clone a private repo without credentials (fast clear error, no leftover folder), clone a bad URL, clone into a folder that already contains the target name (existing "already exists" error). During each, drag the window and switch sections to confirm the UI stays responsive.

## B. Git Update/Pull

Same root cause: `git_status`, `git_remote_url`, `git_is_repository`, `git_pull` are all synchronous main-thread commands, and `inspectRepository` fires two of them on every Git-screen mount. `git pull` on a repo with an SSH/HTTPS remote can hang on credentials exactly like clone.

Fix: identical treatment — async + `spawn_blocking`, prompt suppression, timeout. The uncommitted-changes guard in `git_pull` stays exactly as is (dirty tree → refuse with the current message).

Testing: pull an up-to-date repo, a behind repo, a dirty repo (must refuse), and a repo whose remote needs credentials (clear error, no freeze).

## C. Copy Name intermittent crash

`src/lib/clipboard.ts` does a dynamic `import("@tauri-apps/plugin-clipboard-manager")` on every copy, and on failure falls through to a DOM `textarea` + `document.execCommand("copy")` path. Two real hazards:
- The copy runs from a Radix `ContextMenuItem` `onSelect`, i.e. while the menu is unmounting and returning focus. Inserting a textarea, focusing and selecting it at that moment fights the menu's focus restoration — this is the classic source of a one-off webview crash/hang inside WebKitGTK/WebView2, and it matches "crashed once, fine afterwards".
- The first call pays for a lazy chunk load; if that import rejects mid-teardown the fallback runs at the worst possible time.

Fix (React only):
- Statically import the clipboard plugin's `writeText` in the desktop path instead of dynamically importing it per call, so no chunk load happens during menu teardown.
- On desktop, do not fall back to the textarea/`execCommand` path at all — report failure via the existing toast. Keep the DOM paths for the browser preview only.
- Capture the node's `name`/`path` as plain strings at menu-open time, guard against empty values, and defer the copy to after the menu has closed (a microtask/`requestAnimationFrame` hop) so it never runs during unmount.
- Wrap the whole copy in try/catch and always toast a result — success only when the clipboard write actually resolved (current behaviour retained).

Testing: right-click many different files and folders in sequence, including immediately after project load and immediately after switching sections; confirm both actions copy and never crash. Verify the deepest-path and root-node cases.

## D. Slow scrolling in Project Map

Root cause (confirmed in code): the tree is fully rendered, with no virtualization, and **each row wraps its own Radix `ContextMenu`** (`ProjectMap.tsx` `TreeNode`). A scan can reach 60,000 files, so the app can mount tens of thousands of Radix menu roots — each with its own state, context and event wiring. On top of that, `selected` is threaded through every node, so clicking one file re-renders the entire tree, and `visiblePaths` is a `Set` lookup per node per render. That is the main-thread cost during scroll, not CSS.

Fix (React only, same visual design):
- Replace the recursive render with a **flattened visible-row list** computed in a `useMemo` (path, name, type, depth, expanded) and render it with virtualization so only on-screen rows exist in the DOM. Add `@tanstack/react-virtual` for this (small, standard, no design change).
- Use **one single `ContextMenu` for the whole tree**: a container-level menu whose target is set on `onContextMenu` of a row. Removes tens of thousands of menu instances and also removes the teardown hazard behind issue C.
- Move each folder's expanded state from per-node `useState` into one `Set<string>` in `ProjectMap`, so flattening is pure and rows can be memoized.
- Memoize row components and keep handlers stable (`useCallback`) so selecting a file re-renders only the two affected rows.
- Row layout, icons, indentation, colours, filter input and detail sidebar stay byte-for-byte the same visually.

Testing: open a large repo (for example a project with `node_modules` present elsewhere, or a 10k+ file repo), scroll the tree continuously and confirm smooth scrolling; expand/collapse deep folders; type in the filter; select rows; confirm the right-hand detail panel and file counts are unchanged; confirm context menu still copies.

## Which layer each fix touches

| Issue | Layer |
| --- | --- |
| A. Clone freeze / empty folder | Rust (+ small React error/loading copy) |
| B. Pull blocking | Rust |
| C. Copy crash | React only |
| D. Scrolling | React only |

## Architectural notes

- Git stays exactly where it is: React → `gitService.ts` → Tauri command → `git`. Only the execution model inside Rust changes.
- The engine, `ProjectFileSystem`, documentation refresh and re-analyze behaviour are untouched.
- `git` remains a spawned CLI process (no libgit2), keeping future commit/push/branch work on the same path.
- Progress streaming for clone is intentionally out of scope; a responsive spinner plus a timeout is enough for the MVP.

## Recommended order

1. Rust Git async + prompt suppression + timeout + partial-clone cleanup (A and B together — one shared helper).
2. Clipboard hardening (C) — small, and it de-risks the Project Map rework.
3. Project Map flattening, single context menu, virtualization (D).
4. Full pass: type check, lint, then manual verification of each test list above in `npm run tauri dev`.

Note: this sandbox has no Rust toolchain, so the Rust changes compile and can only be verified end-to-end on your machine with `npm run tauri dev`.
