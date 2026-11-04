export interface DependencyNode {
  path: string;
  incoming: number;
  outgoing: number;
  entryPoint: boolean;
}

export interface DependencyEdge {
  source: string;
  target: string;
}

export interface DependencyIssue {
  path: string;
  specifier: string;
  kind: "unresolved" | "dynamic" | "unreadable";
}

export interface CodeIntelligence {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  issues: DependencyIssue[];
  unsupportedFiles: number;
  linesOfCode: number;
  unreadableSourceFiles: number;
}
