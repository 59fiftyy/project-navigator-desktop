import {
  Compass,
  FileText,
  FolderTree,
  GitBranch,
  LayoutDashboard,
  Map,
  NotebookPen,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useProject } from "@/app/projectStore";
import { Button } from "@/components/ui/button";

export type SectionId = "dashboard" | "map" | "docs" | "roadmap" | "git" | "notes" | "settings";

const items: { id: SectionId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "map", label: "Project Map", icon: FolderTree },
  { id: "docs", label: "Documentation", icon: FileText },
  { id: "roadmap", label: "Roadmap", icon: Map },
  { id: "git", label: "Git", icon: GitBranch },
  { id: "notes", label: "Notes", icon: NotebookPen },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  active,
  onNavigate,
}: {
  active: SectionId;
  onNavigate: (id: SectionId) => void;
}) {
  const { context, chooseProject } = useProject();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Compass className="size-4.5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">Atlas</p>
          <p className="text-[11px] text-muted-foreground">Project intelligence</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className={cn("size-4", isActive && "text-primary")} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <p className="truncate px-1 text-xs font-medium text-sidebar-foreground">
          {context?.project.name ?? "No project"}
        </p>
        <p className="mt-0.5 truncate px-1 font-mono text-[10px] text-muted-foreground">
          {context?.project.path ?? "—"}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2.5 w-full"
          onClick={() => void chooseProject()}
        >
          Switch project
        </Button>
      </div>
    </aside>
  );
}
