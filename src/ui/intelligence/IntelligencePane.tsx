import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ExternalLink, FolderOpen, Search } from "lucide-react";
import { toast } from "sonner";
import type { ProjectContext } from "@/engine";
import type { DependencyNode } from "@/engine/dependencies/types";
import { impactedFiles, potentialOrphans } from "@/engine/dependencies/dependencyScanner";
import { relativePath } from "@/app/projectInsights";
import { openPath, revealInFileManager } from "@/platform/desktopService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DependencyGraph = lazy(() => import("./DependencyGraph"));

function FileList({
  title,
  files,
  selected,
  onSelect,
  context,
}: {
  title: string;
  files: DependencyNode[];
  selected: string | null;
  onSelect: (path: string) => void;
  context: ProjectContext;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => scroll.current,
    estimateSize: () => 52,
    overscan: 8,
  });
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <h2 className="border-b border-border px-4 py-3 text-sm font-medium">
        {title} <span className="text-xs text-muted-foreground">{files.length}</span>
      </h2>
      <div ref={scroll} className="min-h-0 flex-1 overflow-auto">
        {!files.length ? (
          <p className="p-4 text-sm text-muted-foreground">No matching files.</p>
        ) : null}
        <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((row) => {
            const file = files[row.index];
            if (!file) return null;
            return (
              <Button
                key={file.path}
                variant="ghost"
                onClick={() => onSelect(file.path)}
                className={cn(
                  "absolute left-0 top-0 flex h-[52px] w-full justify-between rounded-none px-4 text-left",
                  selected === file.path && "bg-selected",
                )}
                style={{ transform: `translateY(${row.start}px)` }}
              >
                <span
                  className="min-w-0 flex-1 truncate font-mono text-xs"
                  title={relativePath(context, file.path)}
                >
                  {relativePath(context, file.path)}
                </span>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                  {file.incoming} in · {file.outgoing} out
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function IntelligencePane({
  context,
  mode,
}: {
  context: ProjectContext;
  mode: "graph" | "insights";
}) {
  const intelligence = context.codeIntelligence;
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const affected = useMemo(
    () =>
      intelligence && selected ? impactedFiles(intelligence.edges, selected) : new Set<string>(),
    [intelligence, selected],
  );
  const lists = useMemo(() => {
    if (!intelligence) return { core: [], orphans: [] };
    const matches = (node: DependencyNode) =>
      node.path.toLowerCase().includes(query.trim().toLowerCase());
    return {
      core: intelligence.nodes
        .filter((node) => node.incoming > 0 && matches(node))
        .sort((a, b) => b.incoming - a.incoming || a.path.localeCompare(b.path)),
      orphans: potentialOrphans(intelligence).filter(matches),
    };
  }, [intelligence, query]);
  const neighbors = useMemo(() => {
    const incoming: string[] = [];
    const outgoing: string[] = [];
    for (const edge of intelligence?.edges ?? []) {
      if (edge.target === selected) incoming.push(edge.source);
      if (edge.source === selected) outgoing.push(edge.target);
    }
    return { incoming, outgoing };
  }, [intelligence, selected]);

  if (!intelligence)
    return (
      <p className="p-6 text-muted-foreground">
        Re-analyze this project to load code intelligence.
      </p>
    );
  const action = async (run: (path: string) => Promise<void>) => {
    if (!selected) return;
    try {
      await run(selected);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open file.");
    }
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3">
        <div className="relative w-64 max-w-full">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a dependency…"
            aria-label="Find a dependency"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {intelligence.nodes.length} JS/TS files · {intelligence.edges.length} connections
        </span>
        <span className="text-xs text-muted-foreground">
          {intelligence.unsupportedFiles} other-language files · {intelligence.issues.length}{" "}
          analysis gaps
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px] max-lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="flex min-h-0 min-w-0 flex-col">
          {mode === "graph" ? (
            <Suspense fallback={<p className="p-6 text-muted-foreground">Loading graph…</p>}>
              <DependencyGraph
                intelligence={intelligence}
                selected={selected}
                onSelect={setSelected}
                query={query}
              />
            </Suspense>
          ) : (
            <>
              <p className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
                Potential orphans have no detected incoming imports. Entry points are excluded; this
                is not proof of unused code.
              </p>
              <div className="flex min-h-0 flex-1 divide-x divide-border max-xl:flex-col max-xl:divide-x-0 max-xl:divide-y">
                <FileList
                  title="Core components"
                  files={lists.core}
                  selected={selected}
                  onSelect={setSelected}
                  context={context}
                />
                <FileList
                  title="Potential orphans"
                  files={lists.orphans}
                  selected={selected}
                  onSelect={setSelected}
                  context={context}
                />
              </div>
            </>
          )}
        </div>
        <aside className="min-h-0 overflow-auto border-l border-border bg-surface px-4 py-5">
          {!selected ? (
            <p className="text-sm text-muted-foreground">No file selected.</p>
          ) : (
            <div className="space-y-5">
              <p className="break-all font-mono text-xs">{relativePath(context, selected)}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void action(openPath)}>
                  <ExternalLink className="size-3.5" />
                  Open
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  title="Reveal in file manager"
                  aria-label="Reveal in file manager"
                  onClick={() => void action(revealInFileManager)}
                >
                  <FolderOpen className="size-4" />
                </Button>
              </div>
              <div className="border-y border-border py-3">
                <p className="text-xs text-muted-foreground">Potential change impact</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{affected.size} files</p>
              </div>
              {[
                { title: "Imported by", paths: neighbors.incoming },
                { title: "Imports", paths: neighbors.outgoing },
                { title: "Affected files (transitive)", paths: [...affected] },
              ].map((list) => (
                <section key={list.title}>
                  <h3 className="mb-2 text-xs font-medium">
                    {list.title} · {list.paths.length}
                  </h3>
                  <div className="max-h-48 space-y-1 overflow-auto">
                    {list.paths.map((path) => (
                      <Button
                        key={path}
                        variant="ghost"
                        className="h-auto w-full justify-start whitespace-normal break-all px-1 py-1 text-left font-mono text-[11px]"
                        onClick={() => setSelected(path)}
                      >
                        {relativePath(context, path)}
                      </Button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          {intelligence.issues.length ? (
            <details className="mt-6 text-xs text-muted-foreground">
              <summary className="cursor-pointer">
                Analysis gaps · {intelligence.issues.length}
              </summary>
              <ul className="mt-2 max-h-64 space-y-2 overflow-auto">
                {intelligence.issues.map((issue, index) => (
                  <li key={`${issue.path}:${index}`} className="break-all">
                    {relativePath(context, issue.path)} · {issue.kind}
                    {issue.specifier ? `: ${issue.specifier}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
