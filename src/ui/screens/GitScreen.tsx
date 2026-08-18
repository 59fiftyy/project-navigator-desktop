import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, FolderOpen, GitBranch, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useProject } from "@/app/projectStore";
import {
  cloneRepository,
  inspectRepository,
  pullRepository,
  type GitRepositoryInfo,
} from "@/platform/gitService";
import { pickProjectDirectory } from "@/platform/runtime";
import { ScreenHeader, EmptyHint } from "@/ui/layout/ScreenHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function message(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unexpected Git error.";
}

export function GitScreen() {
  const { context, openProject } = useProject();

  const [url, setUrl] = useState("");
  const [destination, setDestination] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);
  const [clonedPath, setClonedPath] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const [info, setInfo] = useState<GitRepositoryInfo | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullResult, setPullResult] = useState<string | null>(null);
  const [pullError, setPullError] = useState<string | null>(null);

  const projectPath = context?.project.path ?? null;

  const refreshInfo = useCallback(async () => {
    if (!projectPath) {
      setInfo(null);
      return;
    }

    try {
      setInfo(await inspectRepository(projectPath));
    } catch (error) {
      setInfo(null);
      setPullError(message(error));
    }
  }, [projectPath]);

  useEffect(() => {
    void refreshInfo();
  }, [refreshInfo]);

  const chooseDestination = async () => {
    try {
      const selected = await pickProjectDirectory();
      if (selected) setDestination(selected);
    } catch (error) {
      toast.error(message(error));
    }
  };

  const clone = async () => {
    if (!url.trim() || !destination) return;

    setCloning(true);
    setCloneError(null);
    setClonedPath(null);

    try {
      const path = await cloneRepository(url.trim(), destination);
      setClonedPath(path);
      toast.success("Repository cloned");
    } catch (error) {
      setCloneError(message(error));
    } finally {
      setCloning(false);
    }
  };

  const pull = async () => {
    if (!projectPath) return;

    setPulling(true);
    setPullError(null);
    setPullResult(null);

    try {
      const output = await pullRepository(projectPath);
      setPullResult(output.trim() || "Repository is up to date.");
      toast.success("Repository updated");
      await refreshInfo();
    } catch (error) {
      setPullError(message(error));
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader title="Git" description="Clone repositories and update the current project" />

      <div className="min-h-0 flex-1 space-y-6 overflow-auto overscroll-contain p-6">
        <section className="rounded-lg border border-border bg-surface/40 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Download className="size-4 text-primary" />
            Clone repository
          </h2>

          <div className="mt-4 space-y-3">
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://github.com/user/repository.git"
              spellCheck={false}
            />

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void chooseDestination()}>
                <FolderOpen className="size-4" />
                Choose destination
              </Button>

              <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                {destination ?? "No destination selected"}
              </p>
            </div>

            <Button
              disabled={!url.trim() || !destination || cloning}
              onClick={() => void clone()}
            >
              {cloning ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {cloning ? "Cloning…" : "Clone Repository"}
            </Button>

            {cloneError ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {cloneError}
              </p>
            ) : null}

            {clonedPath ? (
              <div className="space-y-2 rounded-md border border-border bg-background/60 px-3 py-2.5">
                <p className="flex items-center gap-2 text-xs text-foreground">
                  <CheckCircle2 className="size-4 text-primary" />
                  Cloned to
                </p>
                <p className="break-all font-mono text-[11px] text-muted-foreground">{clonedPath}</p>
                <Button size="sm" variant="outline" onClick={() => void openProject(clonedPath)}>
                  Open as project
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface/40 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <GitBranch className="size-4 text-primary" />
            Current project
          </h2>

          {!projectPath ? (
            <EmptyHint>Select a project to use Git actions.</EmptyHint>
          ) : !info?.isRepository ? (
            <EmptyHint>This project is not a Git repository.</EmptyHint>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">Git repository</Badge>
                {info.branch ? <Badge variant="outline">{info.branch}</Badge> : null}
                {info.hasLocalChanges ? (
                  <Badge variant="outline" className="text-destructive">
                    Local changes
                  </Badge>
                ) : null}
              </div>

              <p className="break-all font-mono text-[11px] text-muted-foreground">
                {info.remoteUrl ?? "No remote configured"}
              </p>

              {info.hasLocalChanges ? (
                <p className="rounded-md border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                  Uncommitted local changes were detected. Atlas will not pull to avoid overwriting
                  your work — commit or stash the changes first.
                </p>
              ) : null}

              <Button disabled={pulling} onClick={() => void pull()}>
                {pulling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {pulling ? "Updating…" : "Update Repository"}
              </Button>

              {pullError ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {pullError}
                </p>
              ) : null}

              {pullResult ? (
                <pre className="whitespace-pre-wrap rounded-md border border-border bg-background/60 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  {pullResult}
                </pre>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
