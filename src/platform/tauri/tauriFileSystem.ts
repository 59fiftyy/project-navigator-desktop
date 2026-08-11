import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ProjectFileSystem } from "../projectFileSystem";

export const tauriProjectFileSystem: ProjectFileSystem = {
  async scanDirectory(path: string): Promise<string[]> {
    return await invoke<string[]>("scan_directory", { path });
  },
  async readFile(path: string): Promise<string> {
    return await invoke<string>("read_file", { path });
  },
};

export async function chooseProjectDirectory(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Choose a project folder",
  });

  if (typeof selected === "string") {
    return selected;
  }

  return null;
}
