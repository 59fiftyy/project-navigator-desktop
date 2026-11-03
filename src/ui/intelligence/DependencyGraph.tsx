import { useEffect, useMemo, useState } from "react";
import { ReactFlow, Background, Controls, Position, MarkerType, Handle, type NodeProps, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { CodeIntelligence } from "@/engine/dependencies/types";
import { impactedFiles } from "@/engine/dependencies/dependencyScanner";
import { cn } from "@/lib/utils";

type FileNode = Node<{ label: string; path: string; incoming: number; outgoing: number; core: boolean; highlighted: boolean; dimmed: boolean }>;

function FileGraphNode({ data, selected }: NodeProps<FileNode>) {
  return (
    <div title={data.path} className={cn("flex h-[54px] w-[220px] flex-col justify-center rounded-md border border-border bg-surface-raised px-3", data.core && "border-signal/60", (selected || data.highlighted) && "border-signal bg-selected", data.dimmed && "opacity-30")}>
      <Handle type="target" position={Position.Left} />
      <span className="truncate font-mono text-xs text-foreground">{data.label}</span>
      <span className="text-[10px] text-muted-foreground">{data.incoming} incoming · {data.outgoing} outgoing</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { file: FileGraphNode };

export default function DependencyGraph({ intelligence, selected, onSelect, query }: {
  intelligence: CodeIntelligence;
  selected: string | null;
  onSelect: (path: string | null) => void;
  query: string;
}) {
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setPositions(null);
    setError(null);
    const worker = new Worker(new URL("./graphLayout.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ positions?: { path: string; x: number; y: number }[]; error?: string }>) => {
      if (event.data.error) setError(event.data.error);
      if (event.data.positions) setPositions(new Map(event.data.positions.map(({ path, x, y }) => [path, { x, y }])));
    };
    worker.onerror = () => setError("Could not arrange dependency graph.");
    worker.postMessage({ paths: intelligence.nodes.map((node) => node.path), edges: intelligence.edges });
    return () => worker.terminate();
  }, [intelligence]);

  const affected = useMemo(() => selected ? impactedFiles(intelligence.edges, selected) : new Set<string>(), [intelligence.edges, selected]);
  const nodes = useMemo<FileNode[]>(() => intelligence.nodes.map((node) => ({
    id: node.path,
    type: "file",
    position: positions?.get(node.path) ?? { x: 0, y: 0 },
    selected: selected === node.path,
    draggable: false,
    data: {
      ...node,
      label: node.path.split("/").pop() ?? node.path,
      core: node.incoming >= 3,
      highlighted: affected.has(node.path),
      dimmed: Boolean((selected && selected !== node.path && !affected.has(node.path)) || (query && !node.path.toLowerCase().includes(query.toLowerCase()))),
    },
  })), [intelligence.nodes, positions, selected, affected, query]);
  const edges = useMemo(() => intelligence.edges.map((edge) => ({
    ...edge,
    id: `${edge.source}\0${edge.target}`,
    markerEnd: { type: MarkerType.ArrowClosed },
    className: selected && (edge.target === selected || affected.has(edge.target)) && affected.has(edge.source) ? "atlas-edge-highlighted" : "",
  })), [intelligence.edges, selected, affected]);

  if (error) return <p className="p-6 text-sm text-destructive">{error}</p>;
  if (!positions) return <p role="status" className="p-6 text-sm text-muted-foreground">Arranging {intelligence.nodes.length.toLocaleString()} files…</p>;
  if (!nodes.length) return <p className="p-6 text-sm text-muted-foreground">No JavaScript or TypeScript files in this project.</p>;
  return (
    <ReactFlow
      key={intelligence.nodes.length}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onSelect(node.id)}
      onPaneClick={() => onSelect(null)}
      fitView
      minZoom={0.01}
      maxZoom={2}
      onlyRenderVisibleElements
      nodesConnectable={false}
      nodesDraggable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}