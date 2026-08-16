import type { ProjectFileSystem } from "../../platform/projectFileSystem";
import type { ProjectContext } from "../context/types";
import type { ProjectFile } from "../scanner/types";
import { buildProjectStructure } from "../scanner/projectStructure";
import { classifyFiles } from "../intelligence/fileClassifier";
import { analyzeProject } from "../analyzer/projectAnalyzer";
import { buildProjectKnowledge } from "../knowledge/projectKnowledge";
import { buildProjectContextBase, buildProjectContext } from "../context/projectContext";
import { understandProject } from "../understanding/projectUnderstanding";

function fileEntry(path: string): ProjectFile {
  const name = path.split("/").pop() ?? path;
  const dotIndex = name.lastIndexOf(".");

  return {
    path,
    name,
    extension: dotIndex > 0 ? name.slice(dotIndex + 1) : "",
  };
}

/**
 * Incremental refresh used after a documentation file is written.
 *
 * Re-reads only the project's documentation files (no directory scan, no
 * full-project file reads) and rebuilds the derived, in-memory parts of the
 * context. A full `loadProject` run stays reserved for explicit re-analysis.
 */
export async function refreshProjectDocumentation(
  context: ProjectContext,
  fs: ProjectFileSystem,
  writtenPath?: string,
): Promise<ProjectContext> {
  const isNewFile = writtenPath != null && !context.project.files.some((f) => f.path === writtenPath);

  const files = isNewFile
    ? [...context.project.files, fileEntry(writtenPath)]
    : context.project.files;

  const project = isNewFile
    ? {
        ...context.project,
        files,
        structure: buildProjectStructure(
          context.project.path.replace(/[\\/]+$/, ""),
          files.map((file) => file.path),
        ),
      }
    : context.project;

  const classifiedFiles = isNewFile ? classifyFiles(project.files) : context.analysis.classifiedFiles;
  const analysis = isNewFile ? analyzeProject(project, classifiedFiles) : context.analysis;

  const knowledge = await buildProjectKnowledge(project, classifiedFiles, fs);
  const baseContext = buildProjectContextBase(project, analysis, knowledge);

  return buildProjectContext(baseContext, understandProject(baseContext));
}
