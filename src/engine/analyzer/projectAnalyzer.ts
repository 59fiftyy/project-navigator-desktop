import type { ProjectInfo } from "../scanner/types";
import { classifyFiles } from "../intelligence/fileClassifier";
import type { ProjectAnalysis } from "./types";

export function analyzeProject(
  project: ProjectInfo
): ProjectAnalysis {
  const classifiedFiles = classifyFiles(project.files);

  const importantFileNames = [
    "README.md",
    "package.json",
    "Cargo.toml",
    "tsconfig.json",
    "vite.config.ts",
    "tauri.conf.json",
  ];

  const importantFiles = classifiedFiles
    .filter((file) => importantFileNames.includes(file.name))
    .map((file) => file.path);

  const directories = project.structure.children
    .filter((node) => node.type === "directory")
    .map((node) => node.name);

  let projectType = "Unknown";

  if (project.technologies.includes("Tauri")) {
    projectType = "Tauri Desktop Application";
  } else if (project.technologies.includes("React")) {
    projectType = "React Application";
  } else if (project.technologies.includes("Node.js")) {
    projectType = "Node.js Application";
  }

  return {
    projectType,
    description: `Project containing ${project.files.length} files.`,
    technologies: project.technologies,
    totalFiles: project.files.length,
    importantFiles,
    directories,
    classifiedFiles,
  };
}