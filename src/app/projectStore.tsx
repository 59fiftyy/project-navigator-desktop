import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { loadProject, type EngineStage, type ProjectContext } from "@/engine";
import {
  getProjectFileSystem,
  isDesktopRuntime,
  pickProjectDirectory,
  DESKTOP_ONLY_MESSAGE,
} from "@/platform/runtime";
import {
  clearLastProjectPath,
  loadLastProjectPath,
  saveLastProjectPath,
} from "@/platform/projectStorage";

export type AnalysisStatus = "idle" | "restoring" | "analyzing" | "ready" | "error";

interface ProjectState {
  status: AnalysisStatus;
  projectPath: string | null;
  context: ProjectContext | null;
  stage: EngineStage | null;
  error: string | null;
  desktop: boolean;
  lastAnalyzedAt: Date | null;
  chooseProject: () => Promise<void>;
  reanalyze: () => Promise<void>;
  clearProject: () => Promise<void>;
}

const ProjectStateContext = createContext<ProjectState | null>(null);

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unexpected error while analyzing the project.";
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AnalysisStatus>("restoring");
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [stage, setStage] = useState<EngineStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date | null>(null);

  const desktop = useMemo(() => isDesktopRuntime(), []);
  const runId = useRef(0);

  /** The one and only place the Atlas Engine is invoked. */
  const analyze = useCallback(async (path: string) => {
    const currentRun = ++runId.current;

    setStatus("analyzing");
    setStage("scan");
    setError(null);

    try {
      const fs = await getProjectFileSystem();
      const result = await loadProject(path, fs, {
        onStage: (next) => {
          if (runId.current === currentRun) setStage(next);
        },
      });

      if (runId.current !== currentRun) return;

      setContext(result);
      setStatus("ready");
      setStage("done");
      setLastAnalyzedAt(new Date());
    } catch (caught) {
      if (runId.current !== currentRun) return;
      setContext(null);
      setError(toMessage(caught));
      setStatus("error");
      setStage(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = await loadLastProjectPath();

      if (cancelled) return;

      if (!stored) {
        setStatus("idle");
        return;
      }

      setProjectPath(stored);

      if (!isDesktopRuntime()) {
        setError(DESKTOP_ONLY_MESSAGE);
        setStatus("error");
        return;
      }

      await analyze(stored);
    })();

    return () => {
      cancelled = true;
    };
  }, [analyze]);

  const chooseProject = useCallback(async () => {
    try {
      const selected = await pickProjectDirectory();
      if (!selected) return;

      setProjectPath(selected);
      await saveLastProjectPath(selected);
      await analyze(selected);
    } catch (caught) {
      setError(toMessage(caught));
      setStatus("error");
    }
  }, [analyze]);

  const reanalyze = useCallback(async () => {
    if (!projectPath) return;
    await analyze(projectPath);
  }, [analyze, projectPath]);

  const clearProject = useCallback(async () => {
    runId.current++;
    await clearLastProjectPath();
    setProjectPath(null);
    setContext(null);
    setError(null);
    setStage(null);
    setLastAnalyzedAt(null);
    setStatus("idle");
  }, []);

  const value = useMemo<ProjectState>(
    () => ({
      status,
      projectPath,
      context,
      stage,
      error,
      desktop,
      lastAnalyzedAt,
      chooseProject,
      reanalyze,
      clearProject,
    }),
    [
      status,
      projectPath,
      context,
      stage,
      error,
      desktop,
      lastAnalyzedAt,
      chooseProject,
      reanalyze,
      clearProject,
    ],
  );

  return <ProjectStateContext.Provider value={value}>{children}</ProjectStateContext.Provider>;
}

export function useProject(): ProjectState {
  const value = useContext(ProjectStateContext);
  if (!value) {
    throw new Error("useProject must be used inside <ProjectProvider>");
  }
  return value;
}

/** Narrowed accessor for screens that require an analyzed project. */
export function useProjectContext(): ProjectContext {
  const { context } = useProject();
  if (!context) {
    throw new Error("Project context is not available yet");
  }
  return context;
}
