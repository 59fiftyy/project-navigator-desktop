import type { ClassifiedFile, FileCategory, ProjectContext } from "@/engine";

export interface CategoryCount {
  category: FileCategory;
  count: number;
}

export function countCategories(files: ClassifiedFile[]): CategoryCount[] {
  const counts = new Map<FileCategory, number>();

  for (const file of files) {
    counts.set(file.category, (counts.get(file.category) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export interface RoadmapSection {
  title: string;
  items: string[];
}

/** Parses the engine's raw roadmap markdown into headed sections. */
export function parseRoadmap(roadmap: string | null): RoadmapSection[] {
  if (!roadmap) return [];

  const sections: RoadmapSection[] = [];
  let current: RoadmapSection | null = null;

  for (const rawLine of roadmap.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("```")) continue;

    if (line.startsWith("#")) {
      current = { title: line.replace(/^#+\s*/, "").trim(), items: [] };
      sections.push(current);
      continue;
    }

    const item = line.replace(/^[-*+]\s+/, "").replace(/^\d+[.)]\s+/, "").trim();
    if (!item || item === "---") continue;

    if (!current) {
      current = { title: "Roadmap", items: [] };
      sections.push(current);
    }

    current.items.push(item);
  }

  return sections.filter((section) => section.items.length > 0 || section.title);
}

export function documentationCount(context: ProjectContext): number {
  return context.knowledge.documentation.files.length;
}

export function relativePath(context: ProjectContext, path: string): string {
  const root = context.project.path.replace(/[\\/]+$/, "");
  return path.startsWith(root) ? path.slice(root.length).replace(/^[\\/]+/, "") : path;
}
