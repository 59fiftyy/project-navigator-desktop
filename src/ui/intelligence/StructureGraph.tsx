import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Position,
  Handle,
  type NodeProps,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { File, Folder, FolderOpen } from "lucide-react";

import type { ProjectNode } from "@/engine";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/app/theme";
import { cn } from "@/lib/utils";
import { allDirectoryPaths } from "./structureModel";

type StructureNode = Node<{
  label: string;
  path: string;
  directory: boolean;
  open: boolean;
  files: number;
  selected: boolean;
  dimmed: boolean;
}>;

function StructureGraphNode({ data }: NodeProps<StructureNode>) {
  const Icon = data.directory ? (data.open ? FolderOpen : Folder) : File;
  return (
    <div
      title={data.path}
      className={cn(
        "flex h-[54px] w-[220px] items-center gap-2 rounded-md border border-border bg-surface-raised px-3",
        data.directory && "border-signal/40",
        data.selected && "border-signal bg-selected",
        data.dimmed && "opacity-30",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <Icon
        className={cn("size-4 shrink-0", data.directory ? "text-signal" : "text-muted-foreground")}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-xs text-foreground">{data.label}</span>
        <span className="block text-[10px] text-muted-foreground">
          {data.directory
            ? `${data.files.toLocaleString()} files · ${data.open ? "click to collapse" : "click to expand"}`
            : "file"}
        </span>
      </span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { item: StructureGraphNode };

function countFiles(node: ProjectNode, counts: Map<string, number>): number {
  if (node.type === "file") return 1;
  let total = 0;
  for (const child of node.children) total += countFiles(child, counts);
  counts.set(node.path, total);
  return total;
}

/**
 * Every folder and file of the project as a hierarchy graph. Folders expand on
 * click so large projects stay readable; "Expand all" shows the whole project.
 */
export default function StructureGraph({
  root,
  selected,
  onSelect,
  query,
}: {
  root: ProjectNode;
  selected: string | null;
  onSelect: (path: string | null) => void;
  query: string;
}) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState<Set<string>>(() => allDirectoryPaths(root));
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    countFiles(root, map);
    return map;
  }, [root]);

  useEffect(() => setExpanded(allDirectoryPaths(root)), [root]);

  const graph = useMemo(() => {
    const items: ProjectNode[] = [];
    const edges: { source: string; target: string }[] = [];
    const walk = (node: ProjectNode) => {
      items.push(node);
      if (node.type !== "directory" || !expanded.has(node.path)) return;
      for (const child of node.children) {
        edges.push({ source: node.path, target: child.path });
        walk(child);
      }
    };
    walk(root);
    return { items, edges };
  }, [root, expanded]);

  useEffect(() => {
    setError(null);
    const worker = new Worker(new URL("./graphLayout.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (
      event: MessageEvent<{ positions?: { path: string; x: number; y: number }[]; error?: string }>,
    ) => {
      if (event.data.error) setError(event.data.error);
      if (event.data.positions)
        setPositions(new Map(event.data.positions.map(({ path, x, y }) => [path, { x, y }])));
    };
    worker.onerror = () => setError("Could not arrange the project structure.");
    worker.postMessage({
      paths: graph.items.map((item) => item.path),
      edges: graph.edges,
      hierarchy: true,
    });
    return () => worker.terminate();
  }, [graph]);

  const needle = query.trim().toLowerCase();
  const nodes = useMemo<StructureNode[]>(
    () =>
      graph.items
        .filter((item) => positions?.has(item.path))
        .map((item) => ({
          id: item.path,
          type: "item",
          position: positions?.get(item.path) ?? { x: 0, y: 0 },
          draggable: false,
          data: {
            label: item === root ? item.name || "project" : item.name,
            path: item.path,
            directory: item.type === "directory",
            open: expanded.has(item.path),
            files: counts.get(item.path) ?? 0,
            selected: selected === item.path,
            dimmed: Boolean(needle && !item.name.toLowerCase().includes(needle)),
          },
        })),
    [graph.items, positions, root, expanded, counts, selected, needle],
  );
  const edges = useMemo(
    () =>
      graph.edges
        .filter((edge) => positions?.has(edge.target))
        .map((edge) => ({
          ...edge,
          id: `${edge.source}\0${edge.target}`,
          className:
            selected && (edge.source === selected || edge.target === selected)
              ? "atlas-edge-highlighted"
              : "",
        })),
    [graph.edges, positions, selected],
  );

  const toggle = (path: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const expandAll = () => {
    setExpanded(allDirectoryPaths(root));
  };

  if (error) return <p className="p-6 text-sm text-destructive">{error}</p>;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
        <span>
          {graph.items.length.toLocaleString()} items shown ·{" "}
          {(counts.get(root.path) ?? 0).toLocaleString()} files in project
        </span>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={expandAll}>
          Expand all
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setExpanded(new Set([root.path]))}>
          Collapse all
        </Button>
      </div>
      {!positions ? (
        <p role="status" className="p-6 text-sm text-muted-foreground">
          Arranging {graph.items.length.toLocaleString()} items…
        </p>
      ) : (
        <ReactFlow
          colorMode={theme}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => {
            if (node.data.directory) toggle(node.id);
            onSelect(node.id);
          }}
          onPaneClick={() => onSelect(null)}
          fitView
          minZoom={0.01}
          maxZoom={2}
          onlyRenderVisibleElements
          nodesConnectable={false}
          nodesDraggable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      )}
    </div>
  );
}
