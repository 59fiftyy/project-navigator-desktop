import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { ProjectContext, ProjectNode } from "@/engine";
import { folderRole } from "@/app/dashboardInsights";
import { potentialOrphans } from "@/engine/dependencies/graph";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Panel } from "./Panel";

const ROW = 26;

type Row = { node: ProjectNode; depth: number; files: number };

function fileCounts(node: ProjectNode, counts: Map<string, number>): number {
  if (node.type === "file") return 1;
  let total = 0;
  for (const child of node.children) total += fileCounts(child, counts);
  counts.set(node.path, total);
  return total;
}

function sorted(children: ProjectNode[]): ProjectNode[] {
  return [...children].sort((a, b) =>
    a.type !== b.type ? (a.type === "directory" ? -1 : 1) : a.name.localeCompare(b.name),
  );
}

/** Compact, virtualized file tree of the whole project for the Dashboard. */
export function MapPreview({
  context,
  onOpen,
  onGraph,
  onFolder,
}: {
  context: ProjectContext;
  onOpen: () => void;
  onGraph?: () => void;
  onFolder?: (path: string) => void;
}) {
  const root = context.project.structure;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    fileCounts(root, map);
    return map;
  }, [root]);

  const rows = useMemo(() => {
    const out: Row[] = [];
    const walk = (nodes: ProjectNode[], depth: number) => {
      for (const node of sorted(nodes)) {
        out.push({ node, depth, files: counts.get(node.path) ?? 1 });
        if (node.type === "directory" && expanded.has(node.path)) walk(node.children, depth + 1);
      }
    };
    walk(root.children, 0);
    return out;
  }, [root, expanded, counts]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW,
    overscan: 10,
  });

  const toggle = (path: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  return (
    <Panel
      title="Project map"
      meta={`${context.analysis.totalFiles.toLocaleString()} files`}
      action="View full map"
      onAction={onOpen}
    >
      <p className="mb-2 text-xs text-muted-foreground">
        Click a folder to expand it. Double-click any item to open it in Project Map.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files scanned.</p>
      ) : (
        <div ref={scrollRef} className="h-64 overflow-auto overscroll-contain">
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index];
              if (!row) return null;
              const dir = row.node.type === "directory";
              const open = expanded.has(row.node.path);
              const role = dir && row.depth === 0 ? folderRole(row.node.name) : null;
              return (
                <button
                  key={row.node.path}
                  type="button"
                  title={row.node.path}
                  onClick={() => (dir ? toggle(row.node.path) : onFolder?.(row.node.path))}
                  onDoubleClick={() => onFolder?.(row.node.path)}
                  className={cn(
                    "absolute left-0 top-0 flex w-full items-center gap-1.5 rounded px-2 text-left text-muted-foreground hover:bg-hover hover:text-foreground",
                  )}
                  style={{
                    height: ROW,
                    transform: `translateY(${item.start}px)`,
                    paddingLeft: row.depth * 14 + 8,
                  }}
                >
                  {dir ? (
                    open ? (
                      <ChevronDown className="size-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="size-3.5 shrink-0" />
                    )
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  {dir ? (
                    <Folder className="size-3.5 shrink-0 text-signal/80" />
                  ) : (
                    <File className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate font-mono text-xs text-foreground">
                    {row.node.name}
                  </span>
                  {role ? (
                    <span className="shrink-0 text-[10.5px] text-muted-foreground">{role}</span>
                  ) : null}
                  {dir ? (
                    <span className="ml-auto shrink-0 text-[11px] tabular-nums">
                      {row.files.toLocaleString()}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {context.codeIntelligence ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            {context.codeIntelligence.edges.length} connections ·{" "}
            {potentialOrphans(context.codeIntelligence).length} potential orphans
          </p>
          <Button size="sm" variant="ghost" onClick={onGraph}>
            View Graph
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
