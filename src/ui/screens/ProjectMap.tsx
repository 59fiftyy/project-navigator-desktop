import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, File, Folder, Search } from "lucide-react";
import { toast } from "sonner";
import { useVirtualizer } from "@tanstack/react-virtual";

import { useProject } from "@/app/projectStore";
import { relativePath } from "@/app/projectInsights";
import type { ClassifiedFile, ProjectNode } from "@/engine";
import { ScreenHeader, EmptyHint } from "@/ui/layout/ScreenHeader";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { copyText } from "@/lib/clipboard";

const ROW_HEIGHT = 28;

function sortNodes(nodes: ProjectNode[]): ProjectNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });
}

function buildSortedTree(node: ProjectNode): ProjectNode {
  if (node.type === "file" || node.children.length === 0) {
    return node;
  }

  return {
    ...node,
    children: sortNodes(node.children).map(buildSortedTree),
  };
}

function collectVisiblePaths(node: ProjectNode, query: string, visible: Set<string>): boolean {
  if (!query) {
    visible.add(node.path);

    for (const child of node.children) {
      collectVisiblePaths(child, query, visible);
    }

    return true;
  }

  const selfMatches = node.name.toLowerCase().includes(query);
  let descendantMatches = false;

  for (const child of node.children) {
    if (collectVisiblePaths(child, query, visible)) {
      descendantMatches = true;
    }
  }

  if (selfMatches || descendantMatches) {
    visible.add(node.path);
    return true;
  }

  return false;
}

type TreeRow = { node: ProjectNode; depth: number };

/**
 * Flattens the full recursive tree into the rows that are currently visible.
 * Nothing is limited or truncated — collapsed folders simply contribute no rows,
 * exactly as before, and the virtualizer renders only what fits on screen.
 */
function flattenTree(
  node: ProjectNode,
  depth: number,
  query: string,
  expanded: Set<string>,
  visible: Set<string>,
  rows: TreeRow[],
): void {
  if (!visible.has(node.path)) {
    return;
  }

  rows.push({ node, depth });

  if (node.type !== "directory") {
    return;
  }

  const isOpen = query.length > 0 || expanded.has(node.path);

  if (!isOpen) {
    return;
  }

  for (const child of node.children) {
    flattenTree(child, depth + 1, query, expanded, visible, rows);
  }
}

const TreeRowButton = memo(function TreeRowButton({
  node,
  depth,
  isSelected,
  isExpanded,
  onActivate,
  onContextTarget,
}: {
  node: ProjectNode;
  depth: number;
  isSelected: boolean;
  isExpanded: boolean;
  onActivate: (node: ProjectNode) => void;
  onContextTarget: (node: ProjectNode) => void;
}) {
  const isDirectory = node.type === "directory";

  return (
    <button
      type="button"
      onClick={() => onActivate(node)}
      onContextMenu={() => onContextTarget(node)}
      className={cn(
        "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm",
        "transition-colors",
        isSelected
          ? "bg-primary/15 text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
      style={{ paddingLeft: `${depth * 14 + 8}px`, height: `${ROW_HEIGHT}px` }}
    >
      {isDirectory ? (
        isExpanded ? (
          <ChevronDown className="size-3.5 shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" />
        )
      ) : (
        <span className="w-3.5 shrink-0" />
      )}

      {isDirectory ? (
        <Folder className="size-3.5 shrink-0 text-primary/80" />
      ) : (
        <File className="size-3.5 shrink-0" />
      )}

      <span className="truncate font-mono text-xs">{node.name}</span>
    </button>
  );
});

function countFiles(node: ProjectNode): number {
  if (node.type === "file") {
    return 1;
  }

  return node.children.reduce((total, child) => total + countFiles(child), 0);
}

export function ProjectMap() {
  const { context } = useProject();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ProjectNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Strings captured when the context menu opens, so the copy actions never
  // read from a node that has since been unmounted or replaced.
  const [menuTarget, setMenuTarget] = useState<{ name: string; path: string } | null>(null);

  const classifiedByPath = useMemo(() => {
    const map = new Map<string, ClassifiedFile>();

    for (const file of context?.analysis.classifiedFiles ?? []) {
      map.set(file.path, file);
    }

    return map;
  }, [context]);

  const sortedRoot = useMemo(() => {
    if (!context) {
      return null;
    }

    return buildSortedTree(context.project.structure);
  }, [context]);

  const normalizedQuery = query.trim().toLowerCase();

  const visiblePaths = useMemo(() => {
    const visible = new Set<string>();

    if (sortedRoot) {
      collectVisiblePaths(sortedRoot, normalizedQuery, visible);
    }

    return visible;
  }, [sortedRoot, normalizedQuery]);

  // The root starts open, matching the previous behaviour.
  useEffect(() => {
    setSelected(null);
    setExpanded(sortedRoot ? new Set([sortedRoot.path]) : new Set());
  }, [sortedRoot]);

  const rows = useMemo(() => {
    const collected: TreeRow[] = [];

    if (sortedRoot) {
      flattenTree(sortedRoot, 0, normalizedQuery, expanded, visiblePaths, collected);
    }

    return collected;
  }, [sortedRoot, normalizedQuery, expanded, visiblePaths]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 16,
  });

  const activate = useCallback(
    (node: ProjectNode) => {
      setSelected(node);

      if (node.type === "directory" && !normalizedQuery) {
        setExpanded((current) => {
          const next = new Set(current);

          if (next.has(node.path)) {
            next.delete(node.path);
          } else {
            next.add(node.path);
          }

          return next;
        });
      }
    },
    [normalizedQuery],
  );

  const setContextTarget = useCallback((node: ProjectNode) => {
    setMenuTarget({ name: node.name, path: node.path });
  }, []);

  // Runs after the menu has closed and focus has been restored, which avoids
  // touching the clipboard while Radix is still tearing the menu down.
  const copyAfterMenuClose = useCallback((value: string, label: string) => {
    const text = value ?? "";

    requestAnimationFrame(() => {
      void (async () => {
        try {
          if (!text) {
            toast.error(`Could not copy ${label.toLowerCase()}`);
            return;
          }

          const copied = await copyText(text);

          if (copied) {
            toast.success(`${label} copied`);
          } else {
            toast.error(`Could not copy ${label.toLowerCase()}`);
          }
        } catch {
          toast.error(`Could not copy ${label.toLowerCase()}`);
        }
      })();
    });
  }, []);

  if (!context || !sortedRoot) {
    return null;
  }

  const selectedFile = selected ? classifiedByPath.get(selected.path) : undefined;
  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title="Project Map"
        description={`${context.analysis.totalFiles} files scanned from the selected project`}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-border">
          <div className="border-b border-border px-6 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter files and folders…"
                className="pl-9"
              />
            </div>
          </div>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-3"
          >
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  className="relative w-full"
                  style={{ height: `${virtualizer.getTotalSize()}px` }}
                >
                  {virtualRows.map((virtualRow) => {
                    const row = rows[virtualRow.index];

                    if (!row) {
                      return null;
                    }

                    return (
                      <div
                        key={row.node.path}
                        className="absolute left-0 top-0 w-full"
                        style={{ transform: `translateY(${virtualRow.start}px)` }}
                      >
                        <TreeRowButton
                          node={row.node}
                          depth={row.depth}
                          isSelected={selected?.path === row.node.path}
                          isExpanded={
                            normalizedQuery.length > 0 || expanded.has(row.node.path)
                          }
                          onActivate={activate}
                          onContextTarget={setContextTarget}
                        />
                      </div>
                    );
                  })}
                </div>
              </ContextMenuTrigger>

              <ContextMenuContent className="w-44">
                <ContextMenuItem
                  disabled={!menuTarget}
                  onSelect={() => copyAfterMenuClose(menuTarget?.name ?? "", "Name")}
                >
                  Copy name
                </ContextMenuItem>

                <ContextMenuItem
                  disabled={!menuTarget}
                  onSelect={() => copyAfterMenuClose(menuTarget?.path ?? "", "Path")}
                >
                  Copy path
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>
        </div>

        <aside className="min-h-0 overflow-auto overscroll-contain bg-surface/40 px-5 py-5">
          {!selected ? (
            <EmptyHint>Select a file or folder to inspect it.</EmptyHint>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-mono text-sm text-foreground">{selected.name}</p>

                <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                  {relativePath(context, selected.path) || "."}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <Row label="Type" value={selected.type} />

                {selected.type === "directory" ? (
                  <>
                    <Row label="Children" value={String(selected.children.length)} />

                    <Row label="Files inside" value={String(countFiles(selected))} />
                  </>
                ) : (
                  <>
                    <Row label="Extension" value={selectedFile?.extension || "—"} />

                    <Row label="Category" value={selectedFile?.category ?? "unknown"} />

                    <Row label="Purpose" value={selectedFile?.purpose ?? "Unknown"} />
                  </>
                )}
              </div>

              {selectedFile ? (
                <Badge variant="secondary" className="capitalize">
                  {selectedFile.category}
                </Badge>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right capitalize text-foreground/90">{value}</span>
    </div>
  );
}
