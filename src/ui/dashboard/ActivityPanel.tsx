import { FileText, GitCommitHorizontal, RotateCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ProjectContext } from "@/engine";
import { useProject } from "@/app/projectStore";
import { useActivityLog } from "@/app/activityLog";
import { mergeActivity, relativeTime, type ActivityItem } from "@/app/dashboardInsights";
import { recentCommits } from "@/platform/gitService";
import { Panel } from "./Panel";

const ICONS = { commit: GitCommitHorizontal, doc: FileText, analysis: RotateCw };

export function ActivityPanel({ context }: { context: ProjectContext }) {
  const { lastAnalyzedAt, desktop } = useProject();
  const local = useActivityLog(context.project.path);
  const [commits, setCommits] = useState<ActivityItem[]>([]);
  const [gitNote, setGitNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!desktop) {
      setGitNote("Git history is available in the desktop app.");
      return;
    }
    recentCommits(context.project.path)
      .then((list) => {
        if (cancelled) return;
        setCommits(
          list.map((c) => ({ id: c.hash, kind: "commit", title: c.subject, detail: c.author, at: c.at })),
        );
        setGitNote(list.length ? null : "No Git commits found for this folder.");
      })
      .catch(() => !cancelled && setGitNote("Could not read Git history."));
    return () => {
      cancelled = true;
    };
  }, [context.project.path, desktop, lastAnalyzedAt]);

  const items = useMemo(() => {
    const analysis: ActivityItem[] = lastAnalyzedAt
      ? [{ id: "analysis", kind: "analysis", title: "Project analyzed", at: lastAnalyzedAt.getTime() }]
      : [];
    return mergeActivity(commits, local, analysis).slice(0, 12);
  }, [commits, local, lastAnalyzedAt]);

  return (
    <Panel title="Recent activity" meta={gitNote ?? undefined}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const Icon = ICONS[item.kind];
            return (
              <li key={item.id} className="flex items-center gap-3 py-2 text-sm">
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-foreground/90">{item.title}</span>
                {item.detail ? <span className="shrink-0 text-xs text-muted-foreground">{item.detail}</span> : null}
                <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {relativeTime(item.at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
