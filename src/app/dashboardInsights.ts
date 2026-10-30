import type { ProjectFile } from "@/engine/scanner/types";

export interface FolderCount {
  name: string;
  count: number;
}

/** Counts files per top-level folder; files at the root are grouped as "(root)". */
export function topLevelFolders(
  rootPath: string,
  files: ProjectFile[],
  limit = 8,
): { folders: FolderCount[]; more: number } {
  const root = rootPath.replace(/[\\/]+$/, "").replace(/\\/g, "/");
  const counts = new Map<string, number>();

  for (const file of files) {
    const normalized = file.path.replace(/\\/g, "/");
    const relative = normalized.startsWith(`${root}/`)
      ? normalized.slice(root.length + 1)
      : normalized;
    const slash = relative.indexOf("/");
    const key = slash === -1 ? "(root)" : relative.slice(0, slash);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sorted = Array.from(counts, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );

  return { folders: sorted.slice(0, limit), more: Math.max(sorted.length - limit, 0) };
}

export interface RoadmapTask {
  line: number;
  text: string;
  done: boolean;
  checkbox: boolean;
  section: string;
}

const CHECKBOX = /^(\s*[-*+]\s+)\[([ xX])\]\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;

/** Reads tasks from roadmap markdown: checklists plus plain bullets (open). */
export function parseTasks(markdown: string): RoadmapTask[] {
  const tasks: RoadmapTask[] = [];
  let section = "Roadmap";
  let inFence = false;

  markdown.split("\n").forEach((raw, line) => {
    if (raw.trim().startsWith("```")) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    if (/^\s*#/.test(raw)) {
      section = raw.replace(/^\s*#+\s*/, "").trim() || section;
      return;
    }
    const box = CHECKBOX.exec(raw);
    if (box) {
      tasks.push({ line, text: box[3].trim(), done: box[2] !== " ", checkbox: true, section });
      return;
    }
    const bullet = BULLET.exec(raw);
    if (bullet && bullet[1].trim()) {
      tasks.push({ line, text: bullet[1].trim(), done: false, checkbox: false, section });
    }
  });

  return tasks;
}

/** Toggles the task on `line`; plain bullets become checked checklist items. Other lines untouched. */
export function toggleTask(markdown: string, line: number): string {
  const lines = markdown.split("\n");
  const raw = lines[line];
  if (raw === undefined) return markdown;

  const box = CHECKBOX.exec(raw);
  if (box) {
    lines[line] = `${box[1]}[${box[2] === " " ? "x" : " "}] ${box[3]}`;
  } else {
    const match = /^(\s*[-*+]\s+)(.*)$/.exec(raw);
    if (!match) return markdown;
    lines[line] = `${match[1]}[x] ${match[2]}`;
  }
  return lines.join("\n");
}

export type ActivityKind = "commit" | "doc" | "analysis";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
  at: number;
}

/** Merges activity sources newest first. */
export function mergeActivity(...sources: ActivityItem[][]): ActivityItem[] {
  return sources.flat().sort((a, b) => b.at - a.at);
}

export function relativeTime(at: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(at).toLocaleDateString();
}
