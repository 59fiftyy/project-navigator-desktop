# Atlas — Desktop-First Rebuild (Vite + React + Tauri 2)

## What I found

**This project is a blank Lovable template.** There is no Atlas UI here — only the unused shadcn component library, one placeholder route, and the TanStack Start scaffolding. So nothing existing needs preserving except the shadcn/Tailwind design foundation. The UI will be built fresh, dark and professional, designed around real `ProjectContext` data.

**The engine backup is complete and usable.** 25 files, a clean 7-stage pipeline in `engine/index.ts`:

```text
scanProject -> analyzeProject -> classifyFiles -> buildProjectKnowledge
  -> buildProjectContextBase -> understandProject -> buildProjectContext
```

Only two files touch Tauri directly:
- `scanner/scanner.ts` — `invoke("scan_directory")`
- `scanner/fileReader.ts` — `invoke("read_file")`

Everything else (technology detection, project-tree builder, file classifier, documentation reader, documentation interpreter, understanding extraction of vision/goals/features/requirements/architecture/roadmap/decisions) is pure TypeScript and gets copied over unchanged.

## Architecture

```text
src/ui/            React screens + shadcn components
src/app/           application layer: project store, analysis orchestration
src/engine/        Atlas Engine (copied from backup, Tauri-free)
src/platform/      ProjectFileSystem interface
src/platform/tauri/ Tauri implementation of ProjectFileSystem
src-tauri/         Rust: scan_directory, read_file, dialog plugin
```

## Work

### 1. Runtime conversion
Remove TanStack Start, TanStack Router, Nitro, and the server entry points. Replace with a plain Vite + React SPA (`index.html`, `src/main.tsx`, `src/App.tsx`) using a small in-app view state for the five sections — no router needed for a desktop shell with fixed sidebar nav. Vite `build.outDir` set to `dist`, matched by `tauri.conf.json` `frontendDist`.

### 2. Engine port
Copy all 25 engine files. The only edits:
- Delete `scanner/fileReader.ts`'s Tauri import; the engine receives a `ProjectFileSystem` instead.
- `scanProject(path, fs)`, `readDocumentation(files, fs)`, `buildProjectKnowledge(project, files, fs)`, `loadProject(path, fs)` all thread the abstraction through.
- Fix the hardcoded `name: "Atlas"` in `scanProject` to derive the real folder name from the path.
- Fix the `analyzeProject` double-classification (it re-classifies internally while the pipeline also classifies) so there is exactly one classification pass.

No logic, heuristics, or types are otherwise changed.

```ts
export interface ProjectFileSystem {
  scanDirectory(path: string): Promise<string[]>;
  readFile(path: string): Promise<string>;
}
```

### 3. Tauri layer
- `src-tauri/` with Tauri 2, `tauri-plugin-dialog`, `tauri-plugin-store` (persisting the last project path).
- Rust commands: `scan_directory` (recursive walk, skipping `node_modules`, `.git`, `target`, `dist`, with a file-count cap) and `read_file`.
- `TauriProjectFileSystem` implements `ProjectFileSystem` via `invoke`.
- Native folder picker through the dialog plugin; capabilities/permissions declared in `src-tauri/capabilities/default.json`.
- `npm run tauri dev` / `npm run tauri build` scripts.

### 4. Application layer
A `ProjectProvider` context holding: selected path, analysis status, `ProjectContext | null`, error. Actions: `chooseProject()` (native picker → persist → analyze), `reanalyze()`, `clearProject()`. On launch it restores the persisted path and re-runs the engine. This is the single place the engine is invoked — no second analysis path in the UI.

### 5. UI
Dark, minimal developer-tool aesthetic: near-black surfaces, subtle elevated cards, one restrained accent, tight typographic scale, Lucide icons, fixed left sidebar with the five sections plus a project switcher at the bottom.

- **Empty state** — Atlas mark, "Choose Folder" button, shown when no project is selected.
- **Analyzing state** — pipeline stage indicator while the engine runs.
- **Dashboard** — project name/path, file count, documentation count, directories, technologies, vision, goals, features, requirements, roadmap summary, important files, file-category breakdown.
- **Project Map** — recursive collapsible tree from `project.structure`, search/filter, detail panel showing category, purpose, extension, path for the selected node.
- **Roadmap** — the engine's extracted roadmap, rendered as parsed sections/items; honest empty state when the project has no roadmap doc.
- **Notes** — local persistence keyed by project path so projects don't collide.
- **Settings** — current project, path, choose-another, re-analyze, plus runtime info (Tauri vs browser, app version, engine stage list).

Every screen renders from `ProjectContext`. No mock data anywhere; missing information renders as an explicit empty state.

### 6. Browser preview
A stub `ProjectFileSystem` that reports "desktop only" so the preview loads without crashing. No server-side filesystem layer, no browser scanning.

## Verification limits

This sandbox has no Rust toolchain or desktop session, so I can type-check and lint the frontend and validate the Tauri config, but `npm run tauri dev` and the production desktop build must be run on your machine. I'll leave the config matched to the real build output so it should work first try.
