import { Compass, FolderOpen, MonitorSmartphone } from "lucide-react";

import { useProject } from "@/app/projectStore";
import { Button } from "@/components/ui/button";

export function WelcomeState() {
  const { chooseProject, desktop } = useProject();

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Compass className="size-7" />
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">Atlas</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a project folder on your computer. Atlas scans it, classifies every file, reads
          its documentation and builds a complete picture of the project.
        </p>

        <Button className="mt-7 w-full" size="lg" onClick={() => void chooseProject()}>
          <FolderOpen className="size-4" />
          Choose Folder
        </Button>

        {!desktop ? (
          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <MonitorSmartphone className="size-3.5" />
            Browser preview — run <code className="font-mono">npm run tauri dev</code> to analyze
            projects.
          </p>
        ) : null}
      </div>
    </div>
  );
}
