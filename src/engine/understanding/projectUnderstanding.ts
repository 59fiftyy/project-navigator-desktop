import type { ProjectContextBase } from "../context/types";
import type { ProjectUnderstanding } from "./types";

function extractList(content: string | null): string[] {
  if (!content) {
    return [];
  }

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      // Ignore markdown separators
      if (line === "---" || line === "***" || line === "___") {
        return false;
      }

      // Ignore code fences
      if (line.startsWith("```")) {
        return false;
      }

      // Ignore headings
      if (line.startsWith("#")) {
        return false;
      }

      // Ignore section labels ending with :
      if (line.endsWith(":")) {
        return false;
      }

      return true;
    })
    .map((line) => {
      return line
        .replace(/^[-*+]\s+/, "")
        .replace(/^\d+[.)]\s+/, "")
        .trim();
    })
    .filter(Boolean)
    .filter((line) => line !== "-");
}

export function understandProject(
  context: ProjectContextBase
): ProjectUnderstanding {
  const documentation =
    context.knowledge.documentation.interpreted;

  return {
    projectName: context.project.name,

    projectType: context.analysis.projectType,

    vision: documentation.vision ?? null,

    goals: extractList(documentation.vision ?? null),

    features: extractList(documentation.features ?? null),

    requirements: extractList(
      documentation.requirements ?? null
    ),

    architecture: documentation.architecture ?? null,

    roadmap: documentation.roadmap ?? null,

    decisions: extractList(
      documentation.decisions ?? null
    ),

    technologies: context.project.technologies,

    totalFiles: context.project.files.length,
  };
}