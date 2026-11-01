import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { ProjectContext } from "@/engine";
import { useProject } from "@/app/projectStore";
import { resolveDocuments, targetPath } from "@/app/documentation";
import { parseTasks, toggleTask } from "@/app/dashboardInsights";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Panel } from "./Panel";

export function TasksPanel({
  context,
  onOpenRoadmap,
}: {
  context: ProjectContext;
  onOpenRoadmap: () => void;
}) {
  const { writeProjectFile } = useProject();
  const [busy, setBusy] = useState(false);

  const roadmap = useMemo(
    () => resolveDocuments(context).find((doc) => doc.section.id === "roadmap"),
    [context],
  );
  const content = roadmap?.content ?? null;
  const tasks = useMemo(() => (content ? parseTasks(content) : []), [content]);
  const done = tasks.filter((t) => t.done).length;
  const open = tasks.filter((t) => !t.done).slice(0, 6);

  const toggle = async (line: number) => {
    if (!roadmap?.path || content === null || busy) return;
    setBusy(true);
    try {
      await writeProjectFile(roadmap.path, toggleTask(content, line));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the roadmap.");
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!roadmap) return;
    setBusy(true);
    try {
      await writeProjectFile(targetPath(context, roadmap), roadmap.section.template);
      toast.success("Roadmap.md created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the roadmap.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Tasks"
      meta={tasks.length ? `${done}/${tasks.length}` : undefined}
      action="Open roadmap"
      onAction={onOpenRoadmap}
    >
      {content === null ? (
        <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
          <p>No Roadmap.md yet. Tasks are read from its checklist items.</p>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void create()}>
            Create Roadmap
          </Button>
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Roadmap.md has no list items. Add lines like <code className="font-mono">- [ ] task</code>
          .
        </p>
      ) : (
        <div className="space-y-3">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-signal"
              style={{ width: `${(done / tasks.length) * 100}%` }}
            />
          </div>
          {open.length === 0 ? (
            <p className="text-sm text-muted-foreground">All tasks are done.</p>
          ) : (
            <ul className="space-y-0.5">
              {open.map((task) => (
                <li key={task.line}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggle(task.line)}
                    className="group flex w-full items-start gap-2.5 rounded px-1.5 py-1 text-left text-sm transition-colors hover:bg-hover disabled:opacity-60"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border border-muted-foreground/60",
                        task.done && "border-signal bg-signal",
                      )}
                    >
                      <Check className="size-2.5 opacity-0 group-hover:opacity-40" />
                    </span>
                    <span className="min-w-0 flex-1 text-foreground/90">{task.text}</span>
                    <span className="shrink-0 truncate text-xs text-muted-foreground">
                      {task.section}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}
