import type { ProjectNode } from "./projectStructure";

export interface ProjectFile {
  path: string;
  name: string;
  extension: string;
}

export interface ProjectInfo {
  name: string;
  path: string;
  files: ProjectFile[];
  technologies: string[];
  structure: ProjectNode;
}
