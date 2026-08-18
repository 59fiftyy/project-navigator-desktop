import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, File, Folder, Search } from "lucide-react";
import { toast } from "sonner";

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

function TreeNode({
  node,
  depth,
  query,
  visiblePaths,
  selected,
  onSelect,
  onCopyName,
  onCopyPath,
}: {
  node: ProjectNode;
  depth: number;
  query: string;
  visiblePaths: Set<string>;
  selected: ProjectNode | null;
  onSelect: (node: ProjectNode) => void;
  onCopyName: (node: ProjectNode) => void;
  onCopyPath: (node: ProjectNode) => void;
}) {
  const [open, setOpen] = useState(depth < 1);

  if (!visiblePaths.has(node.path)) {
    return null;
  }

  const isDirectory = node.type === "directory";
  const expanded = query.length > 0 || open;
  const isSelected = selected?.path === node.path;

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            onClick={() => {
              onSelect(node);

              if (isDirectory && !query) {
                setOpen((value) => !value);
              }
            }}
            className={cn(
              "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm",
              "transition-colors",
              isSelected
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
          >
            {isDirectory ? (
              expanded ? (
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
        </ContextMenuTrigger>

        <ContextMenuContent className="w-44">
          <ContextMenuItem onSelect={() => onCopyName(node)}>Copy name</ContextMenuItem>
          <ContextMenuItem onSelect={() => onCopyPath(node)}>Copy path</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isDirectory && expanded
        ? node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              query={query}
              visiblePaths={visiblePaths}
              selected={selected}
              onSelect={onSelect}
              onCopyName={onCopyName}
              onCopyPath={onCopyPath}
            />
          ))
        : null}
    </div>
  );
}

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

  if (!context || !sortedRoot) {
    return null;
  }

  const copy = async (value: string, label: string) => {
    const copied = await copyText(value);
    if (copied) {
      toast.success(`${label} copied`);
    } else {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  const copyName = (node: ProjectNode) => {
    void copy(node.name, "Name");
  };

  // Copies the real filesystem path, not the display label.
  const copyPath = (node: ProjectNode) => {
    void copy(node.path, "Path");
  };

  const selectedFile = selected ? classifiedByPath.get(selected.path) : undefined;

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

          <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-3">
            <TreeNode
              node={sortedRoot}
              depth={0}
              query={normalizedQuery}
              visiblePaths={visiblePaths}
              selected={selected}
              onSelect={setSelected}
              onCopyName={copyName}
              onCopyPath={copyPath}
            />
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
