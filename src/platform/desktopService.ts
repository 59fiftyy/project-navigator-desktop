/**
 * Atlas desktop actions.
 *
 * React never touches the OS directly: "reveal in file manager" and "open with
 * default application" both go through Tauri commands so they work on every
 * platform the desktop app targets.
 */
import { isDesktopRuntime, DESKTOP_ONLY_MESSAGE } from "./runtime";

async function invokeDesktop<T>(command: string, args: Record<string, unknown>): Promise<T> {
  if (!isDesktopRuntime()) {
    throw new Error(DESKTOP_ONLY_MESSAGE);
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<T>(command, args);
}

/** Shows the item in the OS file manager (Explorer / Finder / Files). */
export async function revealInFileManager(path: string): Promise<void> {
  await invokeDesktop("reveal_in_file_manager", { path });
}

/** Opens the item with the OS default application. */
export async function openPath(path: string): Promise<void> {
  await invokeDesktop("open_path", { path });
}
