import { useEffect, useState } from "react";

import { useProject } from "@/app/projectStore";

function ago(date: Date, now: number): string {
  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : date.toLocaleDateString();
}

export function StatusBar() {
  const { context, lastAnalyzedAt, desktop } = useProject();
  const [now, setNow] = useState(() => Date.now());

  // Only this small bar re-renders on the clock tick.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const files = context?.analysis.totalFiles ?? 0;
  const tech = context?.analysis.technologies.length ?? 0;

  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 bg-surface px-4 text-xs text-muted-foreground">
      <span className="tabular-nums">
        {files.toLocaleString()} files · {tech} {tech === 1 ? "technology" : "technologies"}
      </span>
      <span className="ml-auto flex items-center gap-2 tabular-nums">
        <span className="size-[7px] rounded-full bg-signal" />
        {lastAnalyzedAt ? `Analyzed ${ago(lastAnalyzedAt, now)}` : "Not analyzed"}
        {desktop ? "" : " · browser preview"}
      </span>
    </footer>
  );
}
