import type { ProjectInfo } from "../scanner/types";
import type { ClassifiedFile } from "../intelligence/types";
import type { ProjectFileSystem } from "../../platform/projectFileSystem";
import { readDocumentation } from "../intelligence/documentationReader";
import { interpretDocumentation } from "./documentationInterpreter";

import type {
  DocumentationKnowledge,
  ProjectKnowledge,
  ProjectDocumentation,
} from "./types";

export async function buildProjectKnowledge(
  project: ProjectInfo,
  classifiedFiles: ClassifiedFile[],
  fs: ProjectFileSystem,
): Promise<ProjectKnowledge> {
  const documentationFiles = await readDocumentation(classifiedFiles, fs);

  const documentation: DocumentationKnowledge[] = documentationFiles.map((file) => ({
    path: file.path,
    name: file.name,
    purpose: file.purpose,
    content: file.content,
  }));

  const interpreted = interpretDocumentation(documentation);

  const projectDocumentation: ProjectDocumentation = {
    files: documentation,
    interpreted,
  };

  return {
    projectName: project.name,
    projectPath: project.path,
    documentation: projectDocumentation,
    technologies: project.technologies,
    totalFiles: project.files.length,
  };
}
