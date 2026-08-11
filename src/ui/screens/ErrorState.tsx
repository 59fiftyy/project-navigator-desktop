import { AlertTriangle, FolderOpen, RotateCw } from "lucide-react";

import { useProject } from "@/app/projectStore";
import { Button } from "@/components/ui/button";

export function ErrorState() {
  const { error, projectPath, chooseProject, reanalyze } = useProject();

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
          <AlertTriangle className="size-6" />
        </div>

        <h1 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
          Atlas couldn't analyze this project
        </h1>
        {projectPath ? (
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{projectPath}</p>
        ) : null}
        <p className="mt-3 text-sm text-muted-foreground">{error ?? "Unknown error."}</p>

        <div className="mt-6 flex justify-center gap-2">
          {projectPath ? (
            <Button variant="outline" onClick={() => void reanalyze()}>
              <RotateCw className="size-4" />
              Try again
            </Button>
          ) : null}
          <Button onClick={() => void chooseProject()}>
            <FolderOpen className="size-4" />
            Choose another folder
          </Button>
        </div>
      </div>
    </div>
  );
}
