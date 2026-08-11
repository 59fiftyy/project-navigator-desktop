import type { ProjectInfo, ProjectFile } from "./types";
import { buildProjectStructure } from "./projectStructure";
import { detectTechnologies } from "./technologyDetector";
import { invoke } from "@tauri-apps/api/core";

export async function scanProject(path: string): Promise<ProjectInfo> {
  const filePaths = await invoke<string[]>("scan_directory", {
    path,
  });

  const files: ProjectFile[] = filePaths.map((filePath) => {
    const name = filePath.split("/").pop() ?? filePath;

    const extension = name.includes(".")
      ? name.split(".").pop() ?? ""
      : "";

    return {
      path: filePath,
      name,
      extension,
    };
  });

  const technologies = detectTechnologies(filePaths);

  const structure = buildProjectStructure(path, filePaths);

  return {
    name: "Atlas",
    path,
    files,
    technologies,
    structure,
  };
}