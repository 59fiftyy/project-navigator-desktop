import type { ProjectFileSystem } from "./projectFileSystem";

export const DESKTOP_ONLY_MESSAGE =
  "Atlas analyzes projects through the native desktop runtime. Run `npm run tauri dev` to use Atlas.";

/**
 * Secondary, non-functional runtime used only so the browser preview renders.
 * It intentionally provides no filesystem access.
 */
export const unavailableProjectFileSystem: ProjectFileSystem = {
  async scanDirectory(): Promise<string[]> {
    throw new Error(DESKTOP_ONLY_MESSAGE);
  },
  async readFile(): Promise<string> {
    throw new Error(DESKTOP_ONLY_MESSAGE);
  },
};
