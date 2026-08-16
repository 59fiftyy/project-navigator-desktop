import { FileText, Folder, Layers, RotateCw, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { useProject } from "@/app/projectStore";
import {
  countCategories,
  documentationCount,
  relativePath,
} from "@/app/projectInsights";
import { ScreenHeader, EmptyHint } from "@/ui/layout/ScreenHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

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

function List({
  items,
  empty,
}: {
  items: string[];
  empty: string;
}) {
  if (items.length === 0) {
    return <EmptyHint>{empty}</EmptyHint>;
  }

  return (
    <ul className="space-y-1.5 text-sm text-muted-foreground">
      {items.slice(0, 12).map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2">
          <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
          <span className="text-foreground/85">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Dashboard() {
  const { context, reanalyze } = useProject();

  if (!context) return null;

  const { project, analysis, understanding } = context;
  const categories = countCategories(analysis.classifiedFiles);

  return (
    <div className="min-h-full pb-12">
      <ScreenHeader
        title={project.name}
        description={project.path}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void reanalyze()}
          >
            <RotateCw className="size-4" />
            Re-analyze
          </Button>
        }
      />

      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Files" value={analysis.totalFiles} />
          <Stat
            label="Documentation"
            value={documentationCount(context)}
          />
          <Stat
            label="Directories"
            value={analysis.directories.length}
          />
          <Stat
            label="Technologies"
            value={analysis.technologies.length}
          />
        </div>

        <Panel
          title="Project type & stack"
          icon={<Layers className="size-4 text-primary" />}
        >
          <p className="text-sm text-foreground/85">
            {analysis.projectType}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {analysis.technologies.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                No technologies detected.
              </span>
            ) : (
              analysis.technologies.map((tech) => (
                <Badge key={tech} variant="secondary">
                  {tech}
                </Badge>
              ))
            )}
          </div>
        </Panel>

        <Panel
          title="Vision"
          icon={<Sparkles className="size-4 text-primary" />}
        >
          {understanding.vision ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/85 overscroll-contain">
              {understanding.vision}
            </pre>
          ) : (
            <EmptyHint>No Vision.md found in this project.</EmptyHint>
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Goals">
            <List
              items={understanding.goals}
              empty="No goals extracted."
            />
          </Panel>

          <Panel title="Features">
            <List
              items={understanding.features}
              empty="No Features.md found."
            />
          </Panel>

          <Panel title="Requirements">
            <List
              items={understanding.requirements}
              empty="No PRD.md found."
            />
          </Panel>

          <Panel title="Decisions">
            <List
              items={understanding.decisions}
              empty="No ADR.md found."
            />
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Directories"
            icon={<Folder className="size-4 text-primary" />}
          >
            {analysis.directories.length === 0 ? (
              <EmptyHint>No top-level directories.</EmptyHint>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {analysis.directories.map((dir) => (
                  <Badge
                    key={dir}
                    variant="outline"
                    className="font-mono text-xs"
                  >
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
                  const percent = Math.round(
                    (count / Math.max(analysis.totalFiles, 1)) * 100,
                  );

                  return (
                    <li key={category}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize text-foreground/85">
                          {category}
                        </span>

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

        <Panel
          title="Important files"
          icon={<FileText className="size-4 text-primary" />}
        >
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

        <Panel title="Roadmap summary">
          {understanding.roadmap ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/85 overscroll-contain">
              {understanding.roadmap}
            </pre>
          ) : (
            <EmptyHint>No Roadmap.md found in this project.</EmptyHint>
          )}
        </Panel>
      </div>
    </div>
  );
}