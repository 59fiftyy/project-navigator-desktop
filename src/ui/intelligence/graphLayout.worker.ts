import dagre from "@dagrejs/dagre";
import type { DependencyEdge } from "@/engine/dependencies/types";
import { hierarchyPositions } from "./structureModel";

self.onmessage = (
  event: MessageEvent<{ paths: string[]; edges: DependencyEdge[]; hierarchy?: boolean }>,
) => {
  try {
    if (event.data.hierarchy) {
      self.postMessage({ positions: hierarchyPositions(event.data.paths, event.data.edges) });
      return;
    }
    const graph = new dagre.graphlib.Graph();
    graph.setGraph({ rankdir: "LR", nodesep: 32, ranksep: 100 });
    graph.setDefaultEdgeLabel(() => ({}));
    for (const path of event.data.paths) graph.setNode(path, { width: 220, height: 54 });
    for (const edge of event.data.edges) graph.setEdge(edge.source, edge.target);
    dagre.layout(graph);
    self.postMessage({
      positions: event.data.paths.map((path) => {
        const node = graph.node(path);
        return { path, x: node.x - 110, y: node.y - 27 };
      }),
    });
  } catch {
    self.postMessage({ error: "Could not arrange dependency graph." });
  }
};
