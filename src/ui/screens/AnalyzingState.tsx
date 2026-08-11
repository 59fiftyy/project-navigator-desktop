import { Check, Loader2 } from "lucide-react";

import { useProject } from "@/app/projectStore";
import { ENGINE_STAGES } from "@/engine";
import { cn } from "@/lib/utils";

export function AnalyzingState() {
  const { stage, projectPath } = useProject();

  const activeIndex = ENGINE_STAGES.findIndex((item) => item.id === stage);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <p className="text-sm font-semibold tracking-tight text-foreground">Analyzing project</p>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
          {projectPath ?? "Loading Atlas…"}
        </p>

        <ol className="mt-6 space-y-2.5">
          {ENGINE_STAGES.map((item, index) => {
            const done = activeIndex > index || stage === "done";
            const active = activeIndex === index && stage !== "done";

            return (
              <li key={item.id} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border",
                    done && "border-primary/40 bg-primary/15 text-primary",
                    active && "border-primary text-primary",
                    !done && !active && "border-border text-muted-foreground",
                  )}
                >
                  {done ? (
                    <Check className="size-3" />
                  ) : active ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-current opacity-40" />
                  )}
                </span>
                <span className={cn(done || active ? "text-foreground" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
