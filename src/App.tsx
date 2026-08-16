import { useState } from "react";

import { ProjectProvider, useProject } from "@/app/projectStore";
import { Sidebar, type SectionId } from "@/ui/layout/Sidebar";
import { AnalyzingState } from "@/ui/screens/AnalyzingState";
import { ErrorState } from "@/ui/screens/ErrorState";
import { WelcomeState } from "@/ui/screens/WelcomeState";
import { Dashboard } from "@/ui/screens/Dashboard";
import { ProjectMap } from "@/ui/screens/ProjectMap";
import { DocumentationScreen } from "@/ui/screens/DocumentationScreen";
import { RoadmapScreen } from "@/ui/screens/RoadmapScreen";
import { NotesScreen } from "@/ui/screens/NotesScreen";
import { SettingsScreen } from "@/ui/screens/SettingsScreen";
import { Toaster } from "@/components/ui/sonner";

function Shell() {
  const { status, context } = useProject();
  const [section, setSection] = useState<SectionId>("dashboard");

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
      <Sidebar active={section} onNavigate={setSection} />

      <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
        {section === "dashboard" && <Dashboard />}
        {section === "map" && <ProjectMap />}
        {section === "docs" && <DocumentationScreen />}
        {section === "roadmap" && <RoadmapScreen />}
        {section === "notes" && <NotesScreen />}
        {section === "settings" && <SettingsScreen />}
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