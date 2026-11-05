import {
  BookText,
  Code2,
  Cpu,
  FileText,
  Files,
  Folder,
  Layers,
  RotateCw,
  type LucideIcon,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { detectLanguages } from "@/app/dashboardInsights";
import { DocsPanel } from "@/ui/dashboard/DocsPanel";

import { useProject } from "@/app/projectStore";
import { countCategories, documentationCount, relativePath } from "@/app/projectInsights";
import { ScreenHeader, EmptyHint } from "@/ui/layout/ScreenHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPreview } from "@/ui/dashboard/MapPreview";
import { TasksPanel } from "@/ui/dashboard/TasksPanel";
import { ActivityPanel } from "@/ui/dashboard/ActivityPanel";
import type { SectionId } from "@/ui/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MapTarget } from "@/app/mapNavigation";

function Stat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string | undefined;
  icon: LucideIcon;
}) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="flex items-start gap-3 px-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-signal/10">
          <Icon className="size-4 text-signal" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{value}</p>
          {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Counts lines of source code in the background, a few files at a time, so the
 * dashboard never blocks. Recomputed only when the scanned file list changes.
 */
function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5">{children}</CardContent>
    </Card>
  );
}

export function Dashboard({
  onNavigate,
  onOpenMap,
}: {
  onNavigate?: (section: SectionId) => void;
  onOpenMap?: (target: MapTarget) => void;
}) {
  const { context, reanalyze } = useProject();
  const files = context?.project.files;
  const languages = useMemo(() => detectLanguages(files ?? []), [files]);
  const lines = context?.codeIntelligence?.linesOfCode;

  // Category counting walks every classified file; it must not run on every
  // re-render (tab switches, selection changes, toasts). Called before the
  // early return so the hook order stays stable.
  const categories = useMemo(
    () => countCategories(context?.analysis.classifiedFiles ?? []),
    [context?.analysis.classifiedFiles],
  );

  if (!context) return null;

  const { project, analysis } = context;

  return (
    <div className="min-h-full pb-12">
      <ScreenHeader
        title={project.name}
        description={project.path}
      />

      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat icon={Files} label="Files" value={analysis.totalFiles.toLocaleString()} />
          <Stat icon={BookText} label="Documentation" value={documentationCount(context)} />
          <Stat
            icon={Code2}
            label="Lines of code / Languages"
            value={`${lines === undefined ? "—" : `${context.codeIntelligence?.unreadableSourceFiles ? "≥ " : ""}${lines.toLocaleString()}`} / ${languages.length}`}
            hint={
              context.codeIntelligence?.unreadableSourceFiles
                ? `${context.codeIntelligence.unreadableSourceFiles} unreadable files · partial count`
                : languages.slice(0, 4).join(", ") || undefined
            }
          />
          <Stat
            icon={Cpu}
            label="Technologies"
            value={analysis.technologies.length}
            hint={analysis.technologies.slice(0, 3).join(", ") || undefined}
          />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <MapPreview
            context={context}
            onOpen={() => (onOpenMap ? onOpenMap({ view: "tree" }) : onNavigate?.("map"))}
            onGraph={() => onOpenMap?.({ view: "graph" })}
            onFolder={(path) => onOpenMap?.({ view: "tree", path })}
          />
          <TasksPanel context={context} onOpenRoadmap={() => onNavigate?.("roadmap")} />
        </div>

        <DocsPanel context={context} onViewAll={() => onNavigate?.("docs")} />

        <ActivityPanel context={context} />

        <Panel
          title="Project type & stack"
          icon={<Layers className="size-4 text-muted-foreground" />}
        >
          <p className="text-sm text-foreground/85">{analysis.projectType}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {analysis.technologies.length === 0 ? (
              <span className="text-sm text-muted-foreground">No technologies detected.</span>
            ) : (
              analysis.technologies.map((tech) => (
                <Badge key={tech} variant="secondary">
                  {tech}
                </Badge>
              ))
            )}
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Directories" icon={<Folder className="size-4 text-muted-foreground" />}>
            {analysis.directories.length === 0 ? (
              <EmptyHint>No top-level directories.</EmptyHint>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {analysis.directories.map((dir) => (
                  <Badge key={dir} variant="outline" className="font-mono text-xs">
                    {dir}
                  </Badge>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="File categories">
            {categories.length === 0 ? (
              <EmptyHint>No files classified.</EmptyHint>
            ) : (
              <ul className="space-y-2">
                {categories.map(({ category, count }) => {
                  const percent = Math.round((count / Math.max(analysis.totalFiles, 1)) * 100);

                  return (
                    <li key={category}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize text-foreground/85">{category}</span>

                        <span className="tabular-nums text-muted-foreground">
                          {count} · {percent}%
                        </span>
                      </div>

                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Important files" icon={<FileText className="size-4 text-muted-foreground" />}>
          {analysis.importantFiles.length === 0 ? (
            <EmptyHint>No key project files detected.</EmptyHint>
          ) : (
            <ul className="space-y-1 font-mono text-xs text-muted-foreground">
              {analysis.importantFiles.map((file) => (
                <li key={file} className="truncate">
                  {relativePath(context, file)}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
