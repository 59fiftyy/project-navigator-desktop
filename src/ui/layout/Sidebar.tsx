import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { useProject } from "@/app/projectStore";
import { resolveDocuments } from "@/app/documentation";

export type SectionId = "dashboard" | "map" | "docs" | "roadmap" | "git" | "notes" | "settings";

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "map", label: "Project Map" },
  { id: "docs", label: "Documentation" },
  { id: "roadmap", label: "Roadmap" },
  { id: "git", label: "Git" },
  { id: "notes", label: "Notes" },
  { id: "settings", label: "Settings" },
];

export function Sidebar({
  active,
  onNavigate,
}: {
  active: SectionId;
  onNavigate: (id: SectionId) => void;
}) {
  const { context } = useProject();

  const missingDocs = useMemo(
    () => (context ? resolveDocuments(context).filter((doc) => doc.content === null).length : 0),
    [context],
  );

  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col gap-px bg-sidebar px-2.5 py-3">
      {SECTIONS.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "flex h-[30px] items-center rounded-md px-2.5 text-left transition-colors duration-150 ease-out",
              isActive
                ? "bg-hover font-semibold text-foreground"
                : "text-muted-foreground hover:bg-hover hover:text-foreground",
            )}
          >
            {item.label}
            {item.id === "docs" && missingDocs > 0 ? (
              <span
                className="ml-auto tabular-nums text-signal"
                title={`${missingDocs} documentation files missing`}
              >
                {missingDocs}
              </span>
            ) : null}
          </button>
        );
      })}

      <div className="mt-auto px-2.5 py-2 leading-snug">
        <p className="truncate font-semibold">{context?.project.name ?? "No project"}</p>
        <p className="truncate font-mono text-[11px] text-muted-foreground" title={context?.project.path}>
          {context?.project.path ?? "—"}
        </p>
      </div>
    </aside>
  );
}
