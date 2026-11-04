import type { CodeIntelligence, DependencyEdge } from "./types";

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
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  seen.delete(path);
  return seen;
}

export function potentialOrphans(intelligence: CodeIntelligence) {
  const unreadable = new Set(intelligence.issues.filter((issue) => issue.kind === "unreadable").map((issue) => issue.path));
  return intelligence.nodes.filter((node) => node.incoming === 0 && !node.entryPoint && !unreadable.has(node.path));
}