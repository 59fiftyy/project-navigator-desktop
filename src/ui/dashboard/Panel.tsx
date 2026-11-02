import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  title,
  meta,
  action,
  onAction,
  className,
  children,
}: {
  title: string;
  meta?: ReactNode;
  action?: string | undefined;
  onAction?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn("flex min-w-0 flex-col rounded-md border border-border bg-surface", className)}
    >
      <header className="flex h-[38px] shrink-0 items-center gap-2 border-b border-border px-4">
        <h2 className="text-[13px] font-medium text-foreground">{title}</h2>
        {meta ? <span className="text-xs tabular-nums text-muted-foreground">{meta}</span> : null}
        {action ? (
          <button
            type="button"
            onClick={onAction}
            className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
          >
            {action}
            <ArrowUpRight className="size-3.5" />
          </button>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 p-4">{children}</div>
    </section>
  );
}
