import type { ProjectContext } from "@/engine";

export interface DocumentationSection {
  id: string;
  label: string;
  fileName: string;
  description: string;
  template: string;
}

/**
 * The documentation files Atlas can edit. Each section maps to a real
 * source file inside the selected project.
 */
export const DOCUMENTATION_SECTIONS: DocumentationSection[] = [
  {
    id: "vision",
    label: "Vision",
    fileName: "Vision.md",
    description: "Why this project exists",
    template: "# Vision\n\nWrite the project vision here.\n",
  },
  {
    id: "goals",
    label: "Goals",
    fileName: "Goals.md",
    description: "What the project aims to achieve",
    template: "# Goals\n\nWrite the project goals here.\n",
  },
  {
    id: "features",
    label: "Features",
    fileName: "Features.md",
    description: "Feature definitions",
    template: "# Features\n\nWrite the project features here.\n",
  },
  {
    id: "requirements",
    label: "Requirements",
    fileName: "PRD.md",
    description: "Product requirements",
    template: "# Requirements\n\nWrite the product requirements here.\n",
  },
  {
    id: "decisions",
    label: "Decisions",
    fileName: "ADR.md",
    description: "Architecture decision records",
    template: "# Decisions\n\nRecord architecture decisions here.\n",
  },
];

export interface ResolvedDocument {
  section: DocumentationSection;
  /** Absolute path of the existing file, or null when it does not exist. */
  path: string | null;
  content: string | null;
}

function parentDirectory(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? path : path.slice(0, index);
}

/**
 * Directory a new documentation file should be created in: alongside the
 * documentation the project already has, otherwise the project root.
 */
export function documentationDirectory(context: ProjectContext): string {
  const counts = new Map<string, number>();

  for (const file of context.knowledge.documentation.files) {
    if (file.name.toLowerCase() === "readme.md") continue;
    const dir = parentDirectory(file.path);
    counts.set(dir, (counts.get(dir) ?? 0) + 1);
  }

  let best: string | null = null;
  let bestCount = 0;

  for (const [dir, count] of counts) {
    if (count > bestCount) {
      best = dir;
      bestCount = count;
    }
  }

  return best ?? context.project.path.replace(/[\\/]+$/, "");
}

export function resolveDocuments(context: ProjectContext): ResolvedDocument[] {
  return DOCUMENTATION_SECTIONS.map((section) => {
    const match = context.knowledge.documentation.files.find(
      (file) => file.name.toLowerCase() === section.fileName.toLowerCase(),
    );

    return {
      section,
      path: match?.path ?? null,
      content: match?.content ?? null,
    };
  });
}

export function targetPath(context: ProjectContext, document: ResolvedDocument): string {
  return document.path ?? `${documentationDirectory(context)}/${document.section.fileName}`;
}
