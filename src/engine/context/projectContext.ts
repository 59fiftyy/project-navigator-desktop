import type { ProjectAnalysis } from "../analyzer/types";
import type { ProjectKnowledge } from "../knowledge/types";
import type { ProjectInfo } from "../scanner/types";
import type { ProjectUnderstanding } from "../understanding/types";
import type {
  ProjectContext,
  ProjectContextBase,
} from "./types";

export function buildProjectContextBase(
  project: ProjectInfo,
  analysis: ProjectAnalysis,
  knowledge: ProjectKnowledge
): ProjectContextBase {
  return {
    project,
    analysis,
    knowledge,
  };
}

export function buildProjectContext(
  baseContext: ProjectContextBase,
  understanding: ProjectUnderstanding
): ProjectContext {
  return {
    ...baseContext,
    understanding,
  };
}