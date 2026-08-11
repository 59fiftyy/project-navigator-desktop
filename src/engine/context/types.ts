import type { ProjectAnalysis } from "../analyzer/types";
import type { ProjectKnowledge } from "../knowledge/types";
import type { ProjectInfo } from "../scanner/types";
import type { ProjectUnderstanding } from "../understanding/types";

export interface ProjectContextBase {
  project: ProjectInfo;
  analysis: ProjectAnalysis;
  knowledge: ProjectKnowledge;
}

export interface ProjectContext extends ProjectContextBase {
  understanding: ProjectUnderstanding;
}