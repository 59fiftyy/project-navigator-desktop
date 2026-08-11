# Project Navigator Desktop

I want to rebuild Atlas as a true desktop-first application.

IMPORTANT:
Do not continue or patch the current TanStack Start / browser-preview architecture.
Treat the current project as an architectural prototype whose UI can be reused, but rebuild the application structure around the requirements below.

## Product

Atlas is a desktop application for understanding and managing software projects.

The application should run primarily as a native Tauri desktop app on the user's computer.

The browser should NOT be the primary runtime.
A browser preview may exist for development, but all important application functionality must work natively inside Tauri.

## Existing Atlas Engine

I am providing an existing Atlas Engine backup ZIP.

This engine is the source of truth for Atlas's project-analysis capabilities.

The engine currently performs roughly this pipeline:

project path
→ scan project
→ analyze project
→ classify files
→ read documentation
→ build project knowledge
→ build project context
→ understand the project

It currently supports things such as:

- recursive project scanning
- project structure/tree generation
- file classification
- technology detection
- reading project documentation
- extracting project vision
- extracting goals
- extracting features
- extracting requirements
- extracting architecture
- extracting roadmap
- extracting decisions
- building a ProjectContext object

Do NOT replace these capabilities with mock data or a simplified fake implementation.

Preserve the existing engine's functionality and behavior as much as possible.

However, the engine currently talks directly to Tauri through `@tauri-apps/api/core`.

Refactor that boundary.

The engine should NOT depend directly on Tauri.

Introduce a small filesystem/runtime abstraction, for example:

interface ProjectFileSystem {
  scanDirectory(path: string): Promise<string[]>;
  readFile(path: string): Promise<string>;
}

The engine should depend on this abstraction.

Tauri should provide the real desktop implementation.

This makes the engine independent from the UI and runtime.

## Desired architecture

Use a simple desktop-first architecture:

React + TypeScript
Vite
Tauri 2
Atlas Engine

Do NOT use TanStack Start as the application runtime.

Do NOT introduce:
- Nitro
- Cloudflare
- TanStack server functions
- browser filesystem bridges
- server-side filesystem APIs
- web-only project scanning

The desktop application should communicate with the filesystem through Tauri/native Rust commands.

Architecture should look approximately like:

Atlas UI
    ↓
Application layer
    ↓
Atlas Engine
    ↓
ProjectFileSystem abstraction
    ↓
Tauri implementation
    ↓
native filesystem

## Project selection

Project selection must be a real desktop feature.

On first launch:

1. Atlas opens.
2. If no project is selected, show a project-selection state.
3. User clicks "Choose Folder".
4. Tauri opens the native folder picker.
5. User selects a project directory.
6. Atlas stores the selected project path.
7. Atlas analyzes that project using the engine.

On future launches:

- reopen the previously selected project
- provide a way to choose another project

The folder picker must work as a real native Tauri dialog.

Do not implement this as a browser-only preview feature.

## UI

The existing Lovable UI is visually good and should be preserved as much as possible.

Keep the overall visual language, layout, sidebar, cards, typography, spacing and navigation style.

The existing main sections should remain:

- Dashboard
- Project Map
- Roadmap
- Notes
- Settings

They should display real data from the Atlas Engine.

No fake or hardcoded project data.

## Dashboard

The Dashboard should use ProjectContext and display real information such as:

- project name
- project path
- file count
- documentation count
- directories
- technologies
- project vision
- goals
- features
- requirements
- roadmap
- important files
- file categories

## Project Map

Use the engine's real project structure.

Provide:

- recursive file/folder tree
- search/filter
- file classification information
- selected file/folder information

## Roadmap

Use the roadmap extracted by the engine.

## Settings

Show real project/runtime information.

Project settings should include:

- current project
- project path
- ability to choose another project
- re-analyze project

## Notes

Notes can remain a UI-level/local persistence feature for now.

They should be scoped to the current project so notes from different projects do not collide.

## Re-analysis

Add a real "Re-analyze" action.

It should cause Atlas to run the engine again against the currently selected project.

## Runtime requirements

Tauri is the primary runtime.

Implement the required Rust commands for:

- scanning a directory recursively
- reading a file
- choosing a folder through the native dialog

Use appropriate Tauri 2 plugins and permissions.

The application must run with:

npm run tauri dev

and open as a real desktop window.

## Browser preview

Browser preview is optional and secondary.

It must never be required for core Atlas functionality.

Do not build a server-side filesystem compatibility layer just to make browser preview work.

## Production

The project must have a clean Tauri production build.

The Tauri configuration must match the actual frontend build output.

Do not leave the application dependent on a development server for production.

## Code quality

Keep the code modular.

Separate:

- UI
- application/runtime integration
- engine
- filesystem abstraction
- Tauri implementation

Avoid duplicated scanning logic.

There must be one canonical engine pipeline.

Do not create a second independent analysis system in the UI.

## Important constraints

1. Do not rewrite the Atlas engine into a fake simplified engine.
2. Do not add mock project data.
3. Do not make TanStack Start the runtime.
4. Do not make browser filesystem access the primary mechanism.
5. Do not treat Tauri as an optional wrapper added after the fact.
6. Do not break the existing UI unnecessarily.
7. Preserve the existing Atlas capabilities while cleaning up the runtime boundary.

## Before implementing

First inspect the provided Atlas Engine backup and the existing UI.

Determine:
- what engine capabilities already exist
- what UI components/pages already exist
- what can be reused
- what must be refactored
- what Tauri capabilities are required

Then implement the clean architecture above.

Do not start by replacing everything blindly.

The final result should be a real desktop-first Atlas application, not a web preview wrapped in Tauri.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ec32056b-61d7-49ea-9a28-fa346d3a7181).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
