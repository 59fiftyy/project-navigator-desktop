import { scanProject } from "./scanner/scanner";
import { analyzeProject } from "./analyzer/projectAnalyzer";
import { classifyFiles } from "./intelligence/fileClassifier";
import { buildProjectKnowledge } from "./knowledge/projectKnowledge";
import { buildProjectContextBase, buildProjectContext } from "./context/projectContext";
import { understandProject } from "./understanding/projectUnderstanding";
import type { ProjectFileSystem } from "../platform/projectFileSystem";
import type { ProjectContext } from "./context/types";

export type EngineStage =
  | "scan"
  | "analyze"
  | "classify"
  | "knowledge"
  | "context"
  | "understand"
  | "done";

export const ENGINE_STAGES: { id: EngineStage; label: string }[] = [
  { id: "scan", label: "Scanning project" },
  { id: "analyze", label: "Analyzing project" },
  { id: "classify", label: "Classifying files" },
  { id: "knowledge", label: "Reading documentation" },
  { id: "context", label: "Building project context" },
  { id: "understand", label: "Understanding the project" },
];

export interface LoadProjectOptions {
  onStage?: (stage: EngineStage) => void;
}

/**
 * The single canonical Atlas pipeline.
 *
 * path -> scan -> analyze -> classify -> knowledge -> context -> understanding
 */
export async function loadProject(
  path: string,
  fs: ProjectFileSystem,
  options: LoadProjectOptions = {},
): Promise<ProjectContext> {
  const stage = (next: EngineStage) => options.onStage?.(next);

  // 1. Scan
  stage("scan");
  const project = await scanProject(path, fs);

  // 2. Classify files (one canonical classification pass)
  stage("classify");
  const classifiedFiles = classifyFiles(project.files);

  // 3. Analyze
  stage("analyze");
  const analysis = analyzeProject(project, classifiedFiles);

  // 4. Build project knowledge
  stage("knowledge");
  const knowledge = await buildProjectKnowledge(project, classifiedFiles, fs);

  // 5. Build base context
  stage("context");
  const baseContext = buildProjectContextBase(project, analysis, knowledge);

  // 6. Understand the project
  stage("understand");
  const understanding = understandProject(baseContext);

  // 7. Build complete project context
  const context = buildProjectContext(baseContext, understanding);

  stage("done");

  return context;
}

export { scanProject };
export { analyzeProject };
export { classifyFiles };
export { buildProjectKnowledge };
export { buildProjectContext };
export { buildProjectContextBase };
export { understandProject };

export type { ProjectContext, ProjectContextBase } from "./context/types";
export type { ProjectInfo, ProjectFile } from "./scanner/types";
export type { ProjectNode } from "./scanner/projectStructure";
export type { ClassifiedFile, FileCategory } from "./intelligence/types";
export type { ProjectAnalysis } from "./analyzer/types";
export type { ProjectKnowledge } from "./knowledge/types";
export type { ProjectUnderstanding } from "./understanding/types";
