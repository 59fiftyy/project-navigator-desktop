export interface DocumentationKnowledge {
  path: string;
  name: string;
  purpose: string;
  content: string;
}

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

export interface ProjectDocumentation {
  files: DocumentationKnowledge[];
  interpreted: InterpretedDocumentation;
}

export interface ProjectKnowledge {
  projectName: string;
  projectPath: string;

  documentation: ProjectDocumentation;

  technologies: string[];
  totalFiles: number;
}
