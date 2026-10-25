import { useState, type ReactNode } from "react";

import { ProjectProvider, useProject } from "@/app/projectStore";
import { Sidebar, type SectionId } from "@/ui/layout/Sidebar";
import { AnalyzingState } from "@/ui/screens/AnalyzingState";
import { ErrorState } from "@/ui/screens/ErrorState";
import { WelcomeState } from "@/ui/screens/WelcomeState";
import { Dashboard } from "@/ui/screens/Dashboard";
import { ProjectMap } from "@/ui/screens/ProjectMap";
import { DocumentationScreen } from "@/ui/screens/DocumentationScreen";
import { RoadmapScreen } from "@/ui/screens/RoadmapScreen";
import { GitScreen } from "@/ui/screens/GitScreen";
import { NotesScreen } from "@/ui/screens/NotesScreen";
import { SettingsScreen } from "@/ui/screens/SettingsScreen";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

/**
 * Keep-alive pane: a screen mounts the first time it is visited and stays
 * mounted afterwards. Switching tabs only toggles visibility, so tree state,
 * scroll position and memoized computations survive navigation instead of
 * being destroyed and rebuilt on every click.
 */
function Pane({
  active,
  mounted,
  children,
}: {
  active: boolean;
  mounted: boolean;
  children: ReactNode;
}) {
  if (!mounted) {
    return null;
  }

  return (
    <div
      className={cn(
        "h-full min-h-0 overflow-y-auto overscroll-contain",
        !active && "hidden",
      )}
    >
      {children}
    </div>
  );
}

function Shell() {
  const { status, context } = useProject();
  const [section, setSection] = useState<SectionId>("dashboard");
  const [mounted, setMounted] = useState<ReadonlySet<SectionId>>(
    () => new Set<SectionId>(["dashboard"]),
  );

  const navigate = (next: SectionId) => {
    setSection(next);
    setMounted((current) => {
      if (current.has(next)) {
        return current;
      }

      const updated = new Set(current);
      updated.add(next);
      return updated;
    });
  };

  if (status === "restoring" || status === "analyzing") {
    return <AnalyzingState />;
  }

  if (status === "idle") {
    return <WelcomeState />;
  }

  if (status === "error" || !context) {
    return <ErrorState />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar active={section} onNavigate={navigate} />

      <main className="min-w-0 flex-1 overflow-hidden">
        <Pane active={section === "dashboard"} mounted={mounted.has("dashboard")}>
          <Dashboard />
        </Pane>
        <Pane active={section === "map"} mounted={mounted.has("map")}>
          <ProjectMap />
        </Pane>
        <Pane active={section === "docs"} mounted={mounted.has("docs")}>
          <DocumentationScreen />
        </Pane>
        <Pane active={section === "roadmap"} mounted={mounted.has("roadmap")}>
          <RoadmapScreen />
        </Pane>
        <Pane active={section === "git"} mounted={mounted.has("git")}>
          <GitScreen />
        </Pane>
        <Pane active={section === "notes"} mounted={mounted.has("notes")}>
          <NotesScreen />
        </Pane>
        <Pane active={section === "settings"} mounted={mounted.has("settings")}>
          <SettingsScreen />
        </Pane>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <Shell />
      <Toaster />
    </ProjectProvider>
  );
}
