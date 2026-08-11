import type { ProjectFileSystem } from "./projectFileSystem";
import { unavailableProjectFileSystem, DESKTOP_ONLY_MESSAGE } from "./unavailableFileSystem";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isDesktopRuntime(): boolean {
  return typeof window !== "undefined" && window.__TAURI_INTERNALS__ != null;
}

/**
 * Resolves the runtime implementation of ProjectFileSystem.
 * Tauri modules are imported lazily so the browser preview never loads them.
 */
export async function getProjectFileSystem(): Promise<ProjectFileSystem> {
  if (!isDesktopRuntime()) {
    return unavailableProjectFileSystem;
  }

  const { tauriProjectFileSystem } = await import("./tauri/tauriFileSystem");
  return tauriProjectFileSystem;
}

export async function pickProjectDirectory(): Promise<string | null> {
  if (!isDesktopRuntime()) {
    throw new Error(DESKTOP_ONLY_MESSAGE);
  }

  const { chooseProjectDirectory } = await import("./tauri/tauriFileSystem");
  return await chooseProjectDirectory();
}

export { DESKTOP_ONLY_MESSAGE };
export type { ProjectFileSystem };
