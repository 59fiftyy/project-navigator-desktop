/**
 * Atlas Git service.
 *
 * React never talks to Git directly: every operation goes through the Tauri
 * backend commands. Kept intentionally small and modular so later versions can
 * add commit/push/branch operations behind the same interface.
 */
import { isDesktopRuntime, DESKTOP_ONLY_MESSAGE } from "./runtime";

export interface GitRepositoryInfo {
  isRepository: boolean;
  remoteUrl: string | null;
  branch: string | null;
  hasLocalChanges: boolean;
}

async function invokeGit<T>(command: string, args: Record<string, unknown>): Promise<T> {
  if (!isDesktopRuntime()) {
    throw new Error(DESKTOP_ONLY_MESSAGE);
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<T>(command, args);
}

interface GitOutput {
  stdout: string;
  stderr: string;
}

function parseBranch(statusOutput: string): string | null {
  const first = statusOutput.split("\n").find((line) => line.startsWith("## "));
  if (!first) return null;

  return first.slice(3).split("...")[0]?.trim() ?? null;
}

function parseDirty(statusOutput: string): boolean {
  return statusOutput
    .split("\n")
    .some((line) => line.trim().length > 0 && !line.startsWith("## "));
}

export async function inspectRepository(path: string): Promise<GitRepositoryInfo> {
  const isRepository = await invokeGit<boolean>("git_is_repository", { path });

  if (!isRepository) {
    return { isRepository: false, remoteUrl: null, branch: null, hasLocalChanges: false };
  }

  const [status, remoteUrl] = await Promise.all([
    invokeGit<GitOutput>("git_status", { path }),
    invokeGit<string>("git_remote_url", { path }),
  ]);

  return {
    isRepository: true,
    remoteUrl: remoteUrl.trim() ? remoteUrl.trim() : null,
    branch: parseBranch(status.stdout),
    hasLocalChanges: parseDirty(status.stdout),
  };
}

/** Clones a repository and resolves to the absolute path of the new folder. */
export async function cloneRepository(
  url: string,
  destination: string,
  folderName?: string,
): Promise<string> {
  return await invokeGit<string>("git_clone", {
    url,
    destination,
    folderName: folderName?.trim() ? folderName.trim() : null,
  });
}

/** Fast-forward pull; fails safely when the working tree is dirty. */
export async function pullRepository(path: string): Promise<string> {
  return await invokeGit<string>("git_pull", { path });
}
