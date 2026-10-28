import type { ProjectContext } from "@/engine";
import type { ResolvedDocument } from "./documentation";

/** Rough token estimate (≈4 characters per token). Always shown as approximate. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function formatTokens(tokens: number): string {
  return tokens < 1000 ? String(tokens) : `${(tokens / 1000).toFixed(1)}k`;
}

/**
 * Builds a Markdown brief an AI assistant can read: a short project summary
 * followed by the chosen documentation files, in the given order. Documents
 * that do not exist on disk are skipped.
 */
export function buildContextBrief(
  context: Pick<ProjectContext, "project" | "analysis">,
  documents: ResolvedDocument[],
): string {
  const { project, analysis } = context;
  const lines = [
    `# Project: ${project.name}`,
    "",
    `- Type: ${analysis.projectType}`,
    `- Technologies: ${analysis.technologies.length ? analysis.technologies.join(", ") : "none detected"}`,
    `- Files: ${analysis.totalFiles}`,
  ];

  for (const document of documents) {
    if (document.content === null) continue;
    lines.push("", `## ${document.section.fileName}`, "", document.content.trim());
  }

  return `${lines.join("\n")}\n`;
}
