import { Check, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { ProjectContext } from "@/engine";
import { useProject } from "@/app/projectStore";
import { resolveDocuments, targetPath } from "@/app/documentation";
import { appendTask, parseTasks, toggleTask, taskWindow } from "@/app/dashboardInsights";
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
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);

  const roadmap = useMemo(
    () => resolveDocuments(context).find((doc) => doc.section.id === "roadmap"),
    [context],
  );
  const content = roadmap?.content ?? null;
  const tasks = useMemo(() => (content ? parseTasks(content) : []), [content]);
  const { done, open, visible } = taskWindow(tasks, expanded);

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

  const add = async () => {
    const text = draft.trim();
    if (!roadmap || !text || busy) return;
    setBusy(true);
    try {
      const base = content ?? roadmap.section.template;
      await writeProjectFile(roadmap.path ?? targetPath(context, roadmap), appendTask(base, text));
      setDraft("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the task.");
    } finally {
      setBusy(false);
    }
  };

  const addForm = (
    <form
      className="mt-3 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void add();
      }}
    >
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="New task…"
        aria-label="New task"
        className="h-8 min-w-0 flex-1 rounded border border-border bg-background px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-signal"
      />
      <Button type="submit" size="sm" variant="outline" disabled={busy || !draft.trim()}>
        <Plus className="size-3.5" />
        Add task
      </Button>
    </form>
  );

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
      meta={`${done} done / ${tasks.length} total`}
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
        <div>
          <p className="text-sm text-muted-foreground">No tasks yet. Add your first one.</p>
          {addForm}
        </div>
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
              {visible.map((task) => (
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
          {open.length > 5 ? (
            <Button size="sm" variant="ghost" onClick={() => setExpanded((value) => !value)}>
              {expanded ? "Show less" : `View all (${open.length})`}
            </Button>
          ) : null}
          {addForm}
        </div>
      )}
    </Panel>
  );
}
