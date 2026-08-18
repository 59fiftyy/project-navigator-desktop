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
  {
    id: "roadmap",
    label: "Roadmap",
    fileName: "Roadmap.md",
    description: "Planned work over time",
    template: "# Roadmap\n\nWrite the project roadmap here.\n",
  },
  {
    id: "readme",
    label: "README",
    fileName: "README.md",
    description: "Project overview",
    template: "# README\n\nDescribe the project here.\n",
  },
];

/**
 * Ordering rule: README.md is always shown last because it is typically the
 * longest document. Every other section keeps its declared order.
 */
function documentSortWeight(fileName: string): number {
  return fileName.toLowerCase() === "readme.md" ? 1 : 0;
}


export interface ResolvedDocument {
  section: DocumentationSection;
  /** Absolute path of the existing file, or null when it does not exist. */
  path: string | null;
  content: string | null;
}

/** Folder Atlas creates its own documentation files in. */
export const ATLAS_DOCS_FOLDER = "Atlas";

/**
 * Directory a new documentation file is created in. Atlas always writes the
 * files it creates into a dedicated `Atlas/` folder inside the project, so it
 * stays obvious which documents Atlas authored. Existing documentation
 * elsewhere in the project is never moved.
 */
export function documentationDirectory(context: ProjectContext): string {
  const root = context.project.path.replace(/[\\/]+$/, "");
  return `${root}/${ATLAS_DOCS_FOLDER}`;
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
