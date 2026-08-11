import type { DocumentationKnowledge } from "./types";

export interface InterpretedDocumentation {
  vision?: string;
  requirements?: string;
  architecture?: string;
  roadmap?: string;
  features?: string;
  decisions?: string;
  database?: string;
  dataModel?: string;
  ui?: string;
}

export function interpretDocumentation(
  documentation: DocumentationKnowledge[],
): InterpretedDocumentation {
  const result: InterpretedDocumentation = {};

  for (const document of documentation) {
    const name = document.name.toLowerCase();

    if (name === "vision.md") {
      result.vision = document.content;
    } else if (name === "prd.md") {
      result.requirements = document.content;
    } else if (name === "architecture.md") {
      result.architecture = document.content;
    } else if (name === "roadmap.md") {
      result.roadmap = document.content;
    } else if (name === "features.md") {
      result.features = document.content;
    } else if (name === "adr.md") {
      result.decisions = document.content;
    } else if (name === "database.md") {
      result.database = document.content;
    } else if (name === "datamodel.md") {
      result.dataModel = document.content;
    } else if (name === "ui.md") {
      result.ui = document.content;
    }
  }

  return result;
}
