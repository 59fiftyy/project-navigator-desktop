import { useEffect, useState } from "react";

import type { ActivityItem } from "./dashboardInsights";

const EVENT = "atlas:activity";
const MAX = 30;

function key(projectPath: string): string {
  return `atlas.activity:${projectPath}`;
}

export function readActivity(projectPath: string | null): ActivityItem[] {
  if (!projectPath) return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key(projectPath)) ?? "[]");
    return Array.isArray(parsed) ? (parsed as ActivityItem[]) : [];
  } catch {
    return [];
  }
}

/** Records a local Atlas action (doc save/create) for the project's activity feed. */
export function recordActivity(projectPath: string, item: Omit<ActivityItem, "id" | "at">) {
  const next = [
    { ...item, id: crypto.randomUUID(), at: Date.now() },
    ...readActivity(projectPath),
  ].slice(0, MAX);
  try {
    localStorage.setItem(key(projectPath), JSON.stringify(next));
  } catch {
    /* best effort */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useActivityLog(projectPath: string | null): ActivityItem[] {
  const [items, setItems] = useState<ActivityItem[]>(() => readActivity(projectPath));

  useEffect(() => {
    const update = () => setItems(readActivity(projectPath));
    update();
    window.addEventListener(EVENT, update);
    return () => window.removeEventListener(EVENT, update);
  }, [projectPath]);

  return items;
}
