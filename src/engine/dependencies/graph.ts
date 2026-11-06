import type { CodeIntelligence, DependencyEdge } from "./types";

/** Direct importers and imports are separate from transitive change impact. */
export function directConnections(edges: DependencyEdge[], path: string): Set<string> {
  const neighbors = new Set<string>();
  for (const edge of edges) {
    if (edge.source === path) neighbors.add(edge.target);
    if (edge.target === path) neighbors.add(edge.source);
  }
  return neighbors;
}

export function isHighlightedConnection(
  edge: DependencyEdge,
  selected: string | null,
  affected: ReadonlySet<string>,
): boolean {
  return Boolean(
    selected &&
      (edge.source === selected ||
        edge.target === selected ||
        (affected.has(edge.source) && affected.has(edge.target))),
  );
}

/** Reverse dependency traversal: all files potentially affected by a change. */
export function impactedFiles(edges: DependencyEdge[], path: string): Set<string> {
  const reverse = new Map<string, string[]>();
  for (const edge of edges) {
    const sources = reverse.get(edge.target);
    if (sources) sources.push(edge.source);
    else reverse.set(edge.target, [edge.source]);
  }
  const seen = new Set([path]);
  const queue = [path];
  for (let index = 0; index < queue.length; index++) {
    for (const next of reverse.get(queue[index] ?? "") ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  seen.delete(path);
  return seen;
}

export function potentialOrphans(intelligence: CodeIntelligence) {
  const unreadable = new Set(
    intelligence.issues.filter((issue) => issue.kind === "unreadable").map((issue) => issue.path),
  );
  return intelligence.nodes.filter(
    (node) => node.incoming === 0 && !node.entryPoint && !unreadable.has(node.path),
  );
}
