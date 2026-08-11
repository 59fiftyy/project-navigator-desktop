import type { ProjectInfo, ProjectFile } from "./types";
import type { ProjectFileSystem } from "../../platform/projectFileSystem";
import { buildProjectStructure } from "./projectStructure";
import { detectTechnologies } from "./technologyDetector";

function deriveProjectName(path: string): string {
  const normalized = path.replace(/[\\/]+$/, "");
  const segments = normalized.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? normalized ?? "Project";
}

export async function scanProject(path: string, fs: ProjectFileSystem): Promise<ProjectInfo> {
  const filePaths = await fs.scanDirectory(path);

  const files: ProjectFile[] = filePaths.map((filePath) => {
    const name = filePath.split("/").pop() ?? filePath;

    const extension = name.includes(".") ? (name.split(".").pop() ?? "") : "";

    return {
      path: filePath,
      name,
      extension,
    };
  });

  const technologies = detectTechnologies(filePaths);

  const structure = buildProjectStructure(path, filePaths);

  return {
    name: deriveProjectName(path),
    path,
    files,
    technologies,
    structure,
  };
}
